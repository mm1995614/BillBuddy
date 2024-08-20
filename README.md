# BillBuddy

BillBuddy is a mobile web application designed for bill splitting. It aims to solve problems that friends or family members might encounter when sharing expenses during trips or activities.

**Visit BillBuddy:** [https://billbuddy-428516.de.r.appspot.com/](https://billbuddy-428516.de.r.appspot.com/)


## Key Features

- Record and track expenses
- Automatic debt calculation
- Currency conversion functionality
- View friends' payment information
- Group notebook feature
- Upload photos (e.g., receipts)

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Django (Python)
- Database: MySQL, Google Cloud SQL
- File Storage: Google Cloud Storage
- Deployment: Google App Engine


## Development Environment and Installation

This project was developed using the following environment:

- Python 3.12.4
- Django 4.2 or higher
- Virtual environment: venv

### Key Dependencies

The project relies on several key packages, including:

- Django (4.2+)
- Django REST framework (3.15.1)
- Channels (4.1.0)
- Google Cloud Storage (2.17.0)
- MySQLClient (2.2.4)
- Pillow (10.4.0)
- Gunicorn (22.0.0)

For a complete list of dependencies and their versions, please refer to the `requirements.txt` file in the project root.

### Installation and Setup

1. Ensure you have Python 3.12.4 installed on your system.

2. Navigate to the project directory:
    cd path/to/billbuddy

3. Create and activate a virtual environment:
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`

4. Install dependencies:
    pip install -r requirements.txt

5. Set up your local database:
    - Install MySQL if you haven't already
    - Create a new database for the project

6. Create a `.env` file in the project root and add the following variables:
    DEBUG=True
    DJANGO_SECRET_KEY=your_secret_key_here
    ALLOWED_HOSTS=localhost,127.0.0.1
    LOCAL_DB_NAME=your_db_name
    LOCAL_DB_USER=your_db_user
    LOCAL_DB_PASS=your_db_password
    LOCAL_DB_HOST=127.0.0.1
    LOCAL_DB_PORT=3306
    GS_BUCKET_NAME=your_bucket_name
    GS_PROJECT_ID=your_project_id

7. Update the `DATABASES` configuration in `settings.py`:
- Ensure that the 'else' part of the conditional statement matches your local database settings


8. Run migrations:
    python manage.py migrate

9. Create a superuser:
    python manage.py createsuperuser

10. Start the development server:
    python manage.py runserver

11. Access the application at `http://localhost:8000`

## Deployment

This project is configured to deploy on Google App Engine. To deploy:

1. Ensure you have the Google Cloud SDK installed and configured
2. Update the `app.yaml` file with your project's specific settings
3. Deploy using the following command:
    gcloud app deploy

Note: Make sure to set up the necessary environment variables and secrets in your Google Cloud project before deploying.

## Security Note

For security reasons, sensitive information such as database credentials and secret keys are not included in this repository. When setting up the project, please ensure to use your own secure credentials and never commit sensitive information to version control.

### Additional Notes

- This project uses Google Cloud services. Proper configuration of Google Cloud credentials is required for full functionality.
- The project includes configurations for both development and production environments.
- Gunicorn is included for production deployment.


## Usage Guide

1. Register an account or log in
2. Create a group and add members
3. Record expenses
4. Use currency conversion feature (if needed)
5. Calculate debts
6. View friends' payment information for transfers


## Contact

Zhao-An, Wang
ec23697@qmul.ac.uk

Note: This project is a student final project and is not intended for commercial use.