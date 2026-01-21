# Intellistock

A high-volume inventory management dashboard built for retailers who need to handle 100k+ products without the UI lagging. 

It uses a Django backend to crunch numbers (inventory turnover, ABC analysis, slow movers) and a React frontend for the dashboard. There's also some forecasting stuff under the hood—it uses Prophet and ARIMA to guess future stock needs, but the main focus right now is just making the data accessible and the UI fast.

![Dashboard Preview](./dashboard-preview.png)

## What's Inside

- **Dashboard**: A "Bento Grid" style command center. I just updated this to be fully dark mode (OLED style) because the old light mode was blinding.
- **Forecasting**: Can switch between Prophet (better for seasonal stuff) and ARIMA. It tries to pick the best one automatically.
- **Analytics**: 
    - **ABC Analysis**: Breaks down which 20% of your items make 80% of your money.
    - **Slow Movers**: Flags stuff that hasn't sold in 60+ days so you can clear it out.
- **Optimization**: The backend uses composite indexes and window functions. It's designed to not choke when you load a list of 10,000 items.

## Tech Stack

- **Backend**: Python, Django REST Framework, Celery (for the background tasks).
- **Frontend**: React, Vite, Tailwind CSS (w/ Recharts for the graphs).
- **Database**: PostgreSQL is the target, but runs fine on SQLite for dev.

## How to Run It

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

*(Optional) If you want the forecasting tasks to actually run in the background, you'll need Redis running and start a Celery worker.*

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Go to `http://localhost:5173`.

## Notes

- The default login for the admin panel (if you seeded data) is usually `admin` / `admin`.
- If the dashboard looks empty, run `python manage.py shell < seed_realistic_data.py` in the backend folder to generate some dummy sales data.

## Author

Adnan Ashraf
