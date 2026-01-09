from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from .analytics import InventoryAnalytics
from .models import Product
from forecasting.models import ModelAccuracy
from django.db.models import Sum, F, Avg

class AnalyticsAPI(APIView):
    analytics = InventoryAnalytics()

    def get(self, request, metric):
        # Dispatcher based on URL param or we can separate views
        # User requested specific paths: /api/analytics/turnover/, etc.
        # But commonly we implement separate views or one view with methods. 
        # I'll implement separate methods mapped in urls.py to this ViewSet or just specific Views.
        # Let's use specific Views for clarity or mapped actions.
        pass

class TurnoverAPI(APIView):
    def get(self, request):
        cache_key = "analytics:turnover"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.calculate_turnover_ratio()
            cache.set(cache_key, data, timeout=3600) # 1 hr
            
        return Response(data)

class ABCAnalysisAPI(APIView):
    def get(self, request):
        cache_key = "analytics:abc"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.perform_abc_analysis()
            cache.set(cache_key, data, timeout=21600) # 6 hrs
            
        return Response(data)

class SlowMoversAPI(APIView):
    def get(self, request):
        threshold = int(request.query_params.get('threshold', 60))
        # Don't cache heavily if query param varies, or include param in key
        cache_key = f"analytics:slow_movers:{threshold}"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.detect_slow_movers(threshold)
            cache.set(cache_key, data, timeout=3600)
            
        return Response(data)

class SalesTrendsAPI(APIView):
    def get(self, request):
        days = int(request.query_params.get('days', 90))
        cache_key = f"analytics:sales_trends:{days}"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.calculate_sales_trends(days)
            cache.set(cache_key, data, timeout=1800) # 30 mins
            
        return Response(data)

class DashboardStatsAPI(APIView):
    def get(self, request):
        cache_key = "analytics:dashboard_stats"
        data = cache.get(cache_key)
        
        if not data:
            total_products = Product.objects.count()
            low_stock = Product.objects.filter(current_stock__lt=10).count() # threshold 10
            
            # Inv value
            inv_value = Product.objects.aggregate(
                val=Sum(F('current_stock') * F('price'))
            )['val'] or 0
            
            # Forecast Accuracy
            avg_acc = ModelAccuracy.objects.aggregate(Avg('r2_score'))['r2_score__avg'] or 0
            
            data = {
                "total_products": total_products,
                "low_stock_count": low_stock,
                "inventory_value": float(inv_value),
                "avg_forecast_accuracy": float(avg_acc)
            }
            cache.set(cache_key, data, timeout=900) # 15 mins
            
        return Response(data)
