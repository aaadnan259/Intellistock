"""
Core views including Prometheus metrics endpoint.
"""

from django.http import HttpResponse, HttpResponseForbidden
from django.conf import settings
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST


def metrics_view(request):
    """
    Expose Prometheus metrics.

    Returns metrics in Prometheus text format for scraping.
    Restricted to staff users or internal networks for security.
    """
    # Allow if user is staff (manual inspection)
    if (
        hasattr(request, "user")
        and request.user.is_authenticated
        and request.user.is_staff
    ):
        metrics_output = generate_latest()
        return HttpResponse(metrics_output, content_type=CONTENT_TYPE_LATEST)

    # Allow if request is from internal network (scraping)
    client_ip = request.META.get("REMOTE_ADDR")
    if client_ip in getattr(settings, "INTERNAL_IPS", ["127.0.0.1", "::1"]):
        metrics_output = generate_latest()
        return HttpResponse(metrics_output, content_type=CONTENT_TYPE_LATEST)

    return HttpResponseForbidden("Access denied. Metrics are restricted.")
