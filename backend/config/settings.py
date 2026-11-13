"""Django settings for the UCF repository. Local values come from backend/.env (see .env.example)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Minimal .env loader so no extra dependency is needed. Real environment variables win.
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _value = _line.split("=", 1)
            os.environ.setdefault(_key.strip(), _value.strip())

DEBUG = os.environ.get("UCF_DEBUG", "1") == "1"
SECRET_KEY = os.environ.get("UCF_SECRET_KEY") or ("dev-only-key-not-for-production" if DEBUG else None)
if not SECRET_KEY:
    raise RuntimeError("Set UCF_SECRET_KEY when UCF_DEBUG is 0.")
ALLOWED_HOSTS = [h for h in os.environ.get("UCF_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

# Origins allowed to send forms and API writes. The default is the React dev server.
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get(
    "UCF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173" if DEBUG else "").split(",") if o]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "ucf",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("UCF_DB_NAME", "ucf"),
        "USER": os.environ.get("UCF_DB_USER", "ucf"),
        "PASSWORD": os.environ.get("UCF_DB_PASSWORD", ""),
        "HOST": os.environ.get("UCF_DB_HOST", "localhost"),
        "PORT": os.environ.get("UCF_DB_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["ucf.permissions.ReadOnlyOrAdmin"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Folder holding the framework and mapping CSV files.
UCF_DATA_DIR = PROJECT_ROOT / "data"
