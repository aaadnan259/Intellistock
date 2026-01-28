"""
Core views including Prometheus metrics endpoint.
"""
from django.http import HttpResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST


def metrics_view(request):
    """
    Expose Prometheus metrics.

    Returns metrics in Prometheus text format for scraping.
    """
    metrics_output = generate_latest()
    return HttpResponse(metrics_output, content_type=CONTENT_TYPE_LATEST)
