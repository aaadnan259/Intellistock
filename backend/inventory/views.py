from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from .analytics import InventoryAnalytics
from .models import Product
from forecasting.models import ModelAccuracy
from django.db.models import Sum, F, Avg, Count, Q

class TurnoverAPI(APIView):
    """Calculate inventory turnover ratio by category."""
    
    def get(self, request):
        cache_key = "analytics:turnover"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.calculate_turnover_ratio()
            cache.set(cache_key, data, timeout=3600)  # 1 hour
            
        return Response(data)


class ABCAnalysisAPI(APIView):
    """Perform ABC Analysis using Pareto principle."""
    
    def get(self, request):
        cache_key = "analytics:abc"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.perform_abc_analysis()
            cache.set(cache_key, data, timeout=21600)  # 6 hours
            
        return Response(data)


class SlowMoversAPI(APIView):
    """Detect slow-moving inventory items."""
    
    def get(self, request):
        threshold = int(request.query_params.get('threshold', 60))
        cache_key = f"analytics:slow_movers:{threshold}"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.detect_slow_movers(threshold)
            cache.set(cache_key, data, timeout=3600)  # 1 hour
            
        return Response(data)


class SalesTrendsAPI(APIView):
    """Calculate sales trends with moving average."""
    
    def get(self, request):
        days = int(request.query_params.get('days', 90))
        cache_key = f"analytics:sales_trends:{days}"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.calculate_sales_trends(days)
            cache.set(cache_key, data, timeout=1800)  # 30 mins
            
        return Response(data)


class InventoryHealthAPI(APIView):
    """Get overall inventory health score."""
    
    def get(self, request):
        cache_key = "analytics:health_score"
        data = cache.get(cache_key)
        
        if not data:
            analytics = InventoryAnalytics()
            data = analytics.get_inventory_health_score()
            cache.set(cache_key, data, timeout=1800)  # 30 mins
            
        return Response(data)


class DashboardStatsAPI(APIView):
    """Get dashboard summary statistics."""
    
    def get(self, request):
        cache_key = "analytics:dashboard_stats"
        data = cache.get(cache_key)
        
        if not data:
            # Total products
            total_products = Product.objects.count()
            
            # Low stock (threshold: 10 units)
            low_stock = Product.objects.filter(
                current_stock__gt=0, 
                current_stock__lt=10
            ).count()
            
            # Out of stock
            out_of_stock = Product.objects.filter(current_stock=0).count()
            
            # Total inventory value
            inv_value = Product.objects.aggregate(
                val=Sum(F('current_stock') * F('price'))
            )['val'] or 0
            
            # Average forecast accuracy (R² score from model metrics)
            avg_acc = ModelAccuracy.objects.aggregate(
                Avg('r2_score')
            )['r2_score__avg'] or 0
            
            # Products with forecasts
            products_with_forecasts = ModelAccuracy.objects.values(
                'product'
            ).distinct().count()
            
            data = {
                "total_products": total_products,
                "low_stock_count": low_stock,
                "out_of_stock_count": out_of_stock,
                "inventory_value": float(inv_value),
                "avg_forecast_accuracy": round(float(avg_acc), 3),
                "products_with_forecasts": products_with_forecasts,
                "health_status": "healthy" if low_stock < 5 else "warning" if low_stock < 15 else "critical"
            }
            cache.set(cache_key, data, timeout=900)  # 15 mins
            
        return Response(data)


class TopProductsAPI(APIView):
    """Get top performing products by sales."""
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        days = int(request.query_params.get('days', 30))
        
        cache_key = f"analytics:top_products:{limit}:{days}"
        data = cache.get(cache_key)
        
        if not data:
            from django.utils import timezone
            from datetime import timedelta
            from django.db.models.functions import Coalesce
            from django.db.models import FloatField
            
            cutoff_date = timezone.now().date() - timedelta(days=days)
            
            top_products = Product.objects.annotate(
                revenue=Coalesce(
                    Sum('sales__total_price', filter=Q(sales__sale_date__gte=cutoff_date)),
                    0.0,
                    output_field=FloatField()
                ),
                units_sold=Coalesce(
                    Sum('sales__quantity', filter=Q(sales__sale_date__gte=cutoff_date)),
                    0
                )
            ).filter(revenue__gt=0).order_by('-revenue')[:limit]
            
            data = [{
                'product_id': p.id,
                'name': p.name,
                'sku': p.sku,
                'revenue': float(p.revenue),
                'units_sold': p.units_sold,
                'current_stock': p.current_stock,
                'price': float(p.price)
            } for p in top_products]
            
            cache.set(cache_key, data, timeout=1800)  # 30 mins
            
        return Response(data)


class ClearCacheAPI(APIView):
    """Clear analytics cache (admin only)."""
    
    def post(self, request):
        # In production, add proper authentication check
        cache_keys = [
            "analytics:turnover",
            "analytics:abc",
            "analytics:slow_movers:*",
            "analytics:sales_trends:*",
            "analytics:health_score",
            "analytics:dashboard_stats",
            "analytics:top_products:*"
        ]
        
        # Note: This is a simplified version. 
        # In production with Redis, you'd use cache.delete_pattern() or similar
        try:
            cache.clear()  # Clears entire cache - be careful in production
            return Response({"message": "Cache cleared successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
