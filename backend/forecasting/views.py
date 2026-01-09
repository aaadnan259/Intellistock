from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from inventory.models import Product
from .forecasting_engine import ForecastingEngine
from .models import ForecastResult, ModelAccuracy
from .tasks import batch_forecast_task
from celery.result import AsyncResult

class AdvancedForecastAPI(APIView):
    def post(self, request):
        product_id = request.data.get('product_id')
        days = int(request.data.get('days', 30))
        model_type = request.data.get('model', 'auto')
        
        product = get_object_or_404(Product, pk=product_id)
        
        engine = ForecastingEngine()
        
        # Analyze data first
        characteristics = engine.analyze_product_data(product_id)
        if not characteristics:
            return Response(
                {"error": "Insufficient data to generate forecast (min 14 days required)"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate forecast
        try:
            result = engine.generate_forecast(product_id, days, model_type)
        except Exception as e:
            return Response(
                {"error": f"Forecast generation failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save Results
        forecast_data = result['forecast']
        for item in forecast_data:
            ForecastResult.objects.update_or_create(
                product=product,
                forecast_date=item['date'],
                defaults={
                    'predicted_value': item['value'],
                    'confidence_lower': item['lower'],
                    'confidence_upper': item['upper'],
                    'model_used': result['model_used']
                }
            )
            
        # Save Metrics
        metrics = result['metrics']
        ModelAccuracy.objects.update_or_create(
            product=product,
            model_name=result['model_used'],
            defaults={
                'r2_score': metrics['r2'],
                'mae': metrics['mae'],
                'mape': metrics['mape'],
                'sample_size': characteristics.get('days_count', 0)
            }
        )

        return Response({
            "product_id": product.id,
            "product_name": product.name,
            "model_used": result['model_used'],
            "reason": result['reason'],
            "forecast": forecast_data,
            "metrics": metrics,
            "data_characteristics": characteristics
        })

class BatchForecastAPI(APIView):
    def post(self, request):
        product_ids = request.data.get('product_ids', [])
        days = int(request.data.get('days', 30))
        
        if not product_ids:
            return Response({"error": "No product_ids provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Trigger Celery Task
        task = batch_forecast_task.delay(product_ids, days)
        
        return Response({
            "message": "Batch forecast started",
            "task_id": task.id
        })

class BatchStatusAPI(APIView):
    def get(self, request, task_id):
        task_result = AsyncResult(task_id)
        return Response({
            "task_id": task_id,
            "status": task_result.status,
            "result": task_result.result
        })
