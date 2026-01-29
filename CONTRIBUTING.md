# Contributing to Intellistock

Thanks for considering contributing! Here's how to get set up.

## Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Before Submitting

1. **Run tests**: `pytest` (backend) and `npm test` (frontend)
2. **Check formatting**: `black .` and `npm run lint`
3. **Verify build**: `npm run build`

## Code Style

- Python: Black, flake8, mypy
- JavaScript: ESLint (config in `.eslintrc.cjs`)
- Commits: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Questions?

Open an issue or reach out to [@aaadnan259](https://github.com/aaadnan259).
