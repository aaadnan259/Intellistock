from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class BaseAPIError(Exception):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_code = 'error'

    def __init__(self, detail, status_code=None, code=None):
        self.detail = detail
        if status_code:
            self.status_code = status_code
        if code:
            self.default_code = code

class InsufficientDataError(BaseAPIError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = 'insufficient_data'

class ForecastFailedError(BaseAPIError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_code = 'forecast_failed'

class ProductNotFoundError(BaseAPIError):
    status_code = status.HTTP_404_NOT_FOUND
    default_code = 'not_found'

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['code'] = getattr(exc, 'default_code', 'error')
        response.data['status_code'] = response.status_code
    
    # Handle custom exceptions if DRF didn't catch them
    elif isinstance(exc, BaseAPIError):
        logger.error(f"API Error: {exc.detail}")
        return Response({
            'error': str(exc.detail),
            'code': exc.default_code,
            'status_code': exc.status_code
        }, status=exc.status_code)

    return response
