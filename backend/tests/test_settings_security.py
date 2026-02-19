from django.conf import settings
from django.test import SimpleTestCase

class SecuritySettingsTest(SimpleTestCase):
    def test_drf_permissions_are_secure(self):
        """
        Ensure that DRF is configured with secure default permissions.
        It should not allow unrestricted access by default.
        """
        rest_framework_settings = getattr(settings, 'REST_FRAMEWORK', {})
        permission_classes = rest_framework_settings.get('DEFAULT_PERMISSION_CLASSES', [])

        self.assertIn(
            'rest_framework.permissions.IsAuthenticated',
            permission_classes,
            "REST_FRAMEWORK must have IsAuthenticated as a default permission class."
        )
