# Portfolio Optimizer

A web app that builds an ETF portfolio for a given budget and risk appetite. You choose asset classes, a risk level and a maximum number of holdings, and it returns the optimal allocation with a comparison against standard benchmarks.

Built as a group project for the Decision Analytics course at London Business School (2026).

## What it does

- Pulls daily ETF prices from Yahoo Finance and caches them locally for 24 hours
- Solves a mixed-integer optimisation in Gurobi that maximises expected return minus a CVaR (95%) risk penalty
- Enforces practical constraints: fully invested, at least 2 holdings, a cap on the number of holdings, a maximum weight per asset, and diversification across the selected asset classes
- Compares the result with VOO, BND and a 60/40 blend, including a 3-year backtest
- Explains the result in plain language: top risk contributors, defensive share and concentration

## Stack

- **Backend:** Python, FastAPI, Gurobi (`gurobipy`), pandas, yfinance
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts

## Run locally

You need Python 3.11+, Node.js 20+ and a Gurobi licence (the free academic licence works).

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8001
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies API calls to `http://localhost:8001`.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `GET /asset-classes` | Available asset classes and their ETFs |
| `GET /etf-scatter` | Annualised return and volatility for every ETF |
| `POST /optimize` | Runs the optimisation and returns holdings, benchmarks and backtest |

## Note

This is coursework, not financial advice. Results are based on historical data and say nothing reliable about future returns.
