from django.conf import settings
from google.cloud import storage

def delete_file_from_gcs(file_name):
    if file_name:
        try:
            client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
            bucket = client.bucket(settings.GS_BUCKET_NAME)
            blob = bucket.blob(file_name)
            blob.delete()
        except Exception as e:
            print(f"Error deleting file from cloud storage: {str(e)}")