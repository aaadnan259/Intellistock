import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("intellistock")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule for automated retraining
app.conf.beat_schedule = {
    "retrain-models-daily": {
        "task": "forecasting.retraining_tasks.retrain_all_models",
        "schedule": crontab(hour=2, minute=0),  # Run at 2 AM daily
        "options": {"queue": "retraining"},
    },
    "cleanup-old-runs-weekly": {
        "task": "forecasting.retraining_tasks.cleanup_old_runs",
        "schedule": crontab(hour=3, minute=0, day_of_week="sunday"),
        "options": {"queue": "maintenance"},
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
