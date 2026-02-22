"""
Prometheus metrics middleware.

Records HTTP request metrics for all requests.
"""

import time
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class PrometheusMetricsMiddleware:
    """
    Middleware to collect HTTP request metrics.

    Records request count, latency, and status codes.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._metrics_enabled = getattr(settings, "PROMETHEUS_METRICS_ENABLED", True)

    def __call__(self, request):
        if not self._metrics_enabled:
            return self.get_response(request)

        # Skip metrics for the metrics endpoint itself
        if request.path == "/metrics/":
            return self.get_response(request)

        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time

        try:
            # Lazy import to avoid import errors if prometheus not installed
            from core.metrics import record_request

            # Normalize endpoint path for metrics (remove IDs)
            endpoint = self._normalize_path(request.path)

            record_request(
                method=request.method,
                endpoint=endpoint,
                status=response.status_code,
                duration=duration,
            )
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"Failed to record metrics: {e}")

        return response

    def _normalize_path(self, path: str) -> str:
        """
        Normalize path by replacing numeric IDs with placeholders.

        This prevents high cardinality in metrics labels.
        """
        if not path or path == "/":
            return "/"

        # Split and filter out empty parts to handle consecutive slashes
        parts = [p for p in path.strip("/").split("/") if p]
        normalized = []
        for part in parts:
            if part.isdigit():
                normalized.append("{id}")
            else:
                normalized.append(part)

        if not normalized:
            return "/"

        return "/" + "/".join(normalized) + "/"
