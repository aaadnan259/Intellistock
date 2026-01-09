import time
from django.db import connection, reset_queries
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class QueryCountMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            reset_queries()
            start = time.time()
        
        response = self.get_response(request)
        
        if settings.DEBUG:
            end = time.time()
            total_time = end - start
            queries = len(connection.queries)
            
            logger.info(f"{request.path}: {queries} queries, {total_time:.2f}s")
            
            if queries > 10:
                logger.warning(f"HIGH QUERY COUNT: {queries} queries for {request.path}")
                
            # Add to headers for frontend inspection
            response['X-Query-Count'] = str(queries)
            response['X-Response-Time'] = f"{total_time:.3f}s"
            
        return response
