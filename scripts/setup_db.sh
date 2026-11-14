#!/usr/bin/env bash
# One-time setup: start PostgreSQL, create the database and its user from backend/.env,
# build the tables, and load the framework data. Safe to run again.
set -euo pipefail
cd "$(dirname "$0")/../backend"

if [ ! -f .env ]; then
  echo "backend/.env is missing. Copy backend/.env.example to backend/.env and set a password." >&2
  exit 1
fi
set -a; source .env; set +a

echo "Starting PostgreSQL (sudo may ask for your password)..."
sudo systemctl start postgresql
# On Debian and Kali, "postgresql" is only a wrapper that can report active while
# the real cluster is stopped. Start any cluster that is down.
if command -v pg_lsclusters >/dev/null; then
  pg_lsclusters --no-header | while read -r ver name _ status _; do
    [ "$status" = online ] || sudo systemctl start "postgresql@${ver}-${name}"
  done
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -v usr="$UCF_DB_USER" -v pw="$UCF_DB_PASSWORD" -v db="$UCF_DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'usr')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usr') \gexec
-- CREATEDB lets the test suite create its throwaway database.
SELECT format('ALTER ROLE %I LOGIN CREATEDB PASSWORD %L', :'usr', :'pw') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'usr')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec
SQL

.venv/bin/python manage.py migrate
.venv/bin/python manage.py import_ucf
echo
echo "Database ready. Create your admin account next:"
echo "  cd backend && .venv/bin/python manage.py createsuperuser"
