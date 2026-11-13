# Unified Control Framework (UCF) Repository

One central set of security controls, each mapped to the equivalent controls in
NCA ECC-2:2024 and ISO/IEC 27001:2022, so a requirement is implemented and
evidenced once instead of once per framework.

**Pilot scope:** Identity and Access Management. 10 unified controls, 30 mappings.

## What it does

- Hierarchy: Domain > Policy > Unified Control > Evidence.
- Two-way traceability: from a unified control to every source control it covers, and back.
- Search and filter by framework, domain, coverage, or control ID.
- Owner, implementation status, and evidence status per unified control.
- Dashboard of coverage and gaps per framework.
- Accounts with two roles: viewers read, admins edit.

## Stack

| Part | Technology |
|---|---|
| Database | PostgreSQL |
| Backend | Django, Django REST Framework (`backend/`) |
| Frontend | React, React Router, Tailwind CSS (`frontend/`) |
| Data | CSV files, the source of truth for frameworks and mappings (`data/`) |

## Setup

Requires Python 3.12+, Node 20+, and PostgreSQL.

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env    # then set a database password in it
bash scripts/setup_db.sh                # creates the database, tables, and loads the data
cd backend && .venv/bin/python manage.py createsuperuser
```

```bash
cd frontend && npm install
```

## Run

```bash
cd backend && .venv/bin/python manage.py runserver
```

```bash
cd frontend && npm run dev
```

Open http://localhost:5173. The Django admin site is at http://localhost:5173/admin/.

After editing a CSV in `data/`, reload it with:

```bash
cd backend && .venv/bin/python manage.py import_ucf
```

## Tests

```bash
cd backend && .venv/bin/python manage.py test
```

## Mapping relationships

| Type | Meaning |
|---|---|
| equivalent | Same scope. Meeting one meets the other. |
| covers | The unified control fully satisfies the source control. |
| partial | Satisfies only part of the source control. |
| related | Context only. Gives no compliance credit. |

## Data notes

- NCA ECC text is taken from the official ECC-2:2024 English document.
- ISO/IEC 27001 rows hold official control IDs and titles. The text column is a
  paraphrase written for this project, not the wording of the standard.
