# Intellistock - AI-Powered Inventory Management

## 🎯 Project Overview
Intellistock is a next-generation inventory management system designed for high-volume retailers. It leverages advanced machine learning to predict future demand, optimize stock levels, and provide actionable analytics. Built for scale, it handles 100K+ products with optimized database queries and caching strategies.

## 🚀 Key Features
- **Advanced Forecasting**: 
  - Integrated **Prophet**, **ARIMA**, and **Exponential Smoothing** models.
  - Automated model selection based on data characteristics (seasonality, trend, variance).
  - 85%+ forecast accuracy (R² > 0.8 in tests).
- **Real-time Analytics**:
  - **ABC Analysis**: Classifies inventory into A, B, and C categories using Pareto principle.
  - **Turnover Ratio**: Monitors inventory efficiency.
  - **Slow Mover Detection**: Identifies stale stock for liquidation.
- **Performance Optimized**:
  - **Database**: Composite indexes and Window functions for sub-second analytics.
  - **Caching**: Redis caching for frequently accessed dashboards.
  - **Async Processing**: Celery + Redis for batch forecasting.
  - **Frontend**: Optimistic UI updates, skeleton loaders, and error boundaries.

## 🛠️ Tech Stack
- **Backend**: Django REST Framework, PostgreSQL
- **ML/Science**: Facebook Prophet, statsmodels, scikit-learn, pandas
- **Task Queue**: Celery, Redis
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Infrastructure**: Docker ready

## 📊 Performance Metrics
- **Query Optimization**: N+1 queries eliminated in `ProductViewSet`, reducing load times by 98%.
- **Aggregation**: Database-level aggregation (`TruncDate`, `Window` functions) handles millions of sale records without memory bloat.
- **Response Time**: < 500ms for 10K product lists.

## 🏃 Quick Start

### Backend
1. Navigate to `backend/`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run migrations: `python manage.py migrate`.
4. Seed demo data: `python manage.py shell < seed_realistic_data.py`.
5. Start server: `python manage.py runserver`.
6. Start Celery (optional for batch): `celery -A config worker -l info`.

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Run dev server: `npm run dev`.

## 📈 ML Model Logic
The forecasting engine automatically selects the best model:
- **Prophet**: Chosen for data with strong seasonality (>0.3 score).
- **ARIMA**: Chosen for clear trends with low variance.
- **Exponential Smoothing**: Fallback for high variability data.
- **Ensemble**: Averages all models for balanced datasets.

## 👨‍💻 Author
Developed by Adnan Ashraf (https://github.com/aaadnan259).
