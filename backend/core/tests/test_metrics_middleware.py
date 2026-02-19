import sys
from unittest.mock import MagicMock

# Mock django and core.metrics before importing the middleware
sys.modules["django"] = MagicMock()
sys.modules["django.conf"] = MagicMock()
sys.modules["django.conf.settings"] = MagicMock()
sys.modules["core.metrics"] = MagicMock()

import pytest
from core.metrics_middleware import PrometheusMetricsMiddleware

class MockResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code

def mock_get_response(request):
    return MockResponse()

@pytest.fixture
def middleware():
    return PrometheusMetricsMiddleware(get_response=mock_get_response)

@pytest.mark.parametrize("path,expected", [
    ("/api/products/", "/api/products/"),
    ("/api/products/123/", "/api/products/{id}/"),
    ("/api/orders/123/items/456/", "/api/orders/{id}/items/{id}/"),
    ("/", "/"),  # Desired behavior (currently fails, returns //)
    ("/api/products/p123/", "/api/products/p123/"),
    ("api/products", "/api/products/"),
    ("/api/products", "/api/products/"),
    ("api/products/", "/api/products/"),
    ("", "/"),  # Desired behavior (currently fails, returns //)
    ("/api//products/123", "/api/products/{id}/"), # Desired behavior (currently fails, returns /api//products/{id}/)
])
def test_normalize_path(middleware, path, expected):
    assert middleware._normalize_path(path) == expected

def test_middleware_call(middleware):
    request = MagicMock()
    request.path = "/api/products/123/"
    request.method = "GET"

    mock_metrics = sys.modules["core.metrics"]
    # Reset the mock to track new calls
    mock_metrics.record_request.reset_mock()

    middleware(request)

    mock_metrics.record_request.assert_called_once()
    args, kwargs = mock_metrics.record_request.call_args
    assert kwargs["endpoint"] == "/api/products/{id}/"
    assert kwargs["method"] == "GET"
    assert kwargs["status"] == 200
    assert "duration" in kwargs
