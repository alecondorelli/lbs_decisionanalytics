"""Data pipeline: fetch, cache, and process ETF price data."""

import os
import time
import json
import numpy as np
import pandas as pd
import yfinance as yf

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
CACHE_FILE = os.path.join(CACHE_DIR, "prices.parquet")
CACHE_META = os.path.join(CACHE_DIR, "meta.json")
CACHE_TTL = 86400  # 24 hours

UNIVERSE = {
    "US Equities": ["VOO", "QQQ", "IWM", "VTV", "VUG"],
    "International Equities": ["VEA", "EWJ", "VGK", "VWO"],
    # SGOV included per notebook; note its history only starts 2021
    "Fixed Income & Bonds": ["BND", "IEF", "TLT", "LQD", "SGOV"],
    "Real Estate": ["VNQ"],
    "Commodities": ["GLD", "DBC", "USO", "XLE"],
    "Crypto": ["IBIT"],
    "Sector ETFs": ["ITA", "SOXX", "SRVR", "CIBR"],
    "Defensive Sectors": ["XLP", "XLV", "XLU"],
}

TICKER_TO_CLASS = {}
for cls, tickers in UNIVERSE.items():
    for t in tickers:
        TICKER_TO_CLASS[t] = cls

ALL_TICKERS = sorted(TICKER_TO_CLASS.keys())

# Minimum daily observations to include a ticker (3 years, per notebook)
MIN_OBS = 252 * 3


def _cache_is_fresh() -> bool:
    if not os.path.exists(CACHE_META):
        return False
    with open(CACHE_META) as f:
        meta = json.load(f)
    return (time.time() - meta.get("timestamp", 0)) < CACHE_TTL


def fetch_prices(force: bool = False) -> pd.DataFrame:
    """Fetch daily close prices for all ETFs. Uses parquet cache with 24h TTL."""
    if not force and _cache_is_fresh():
        return pd.read_parquet(CACHE_FILE)

    os.makedirs(CACHE_DIR, exist_ok=True)

    # Download all tickers at once (10y to match notebook)
    raw = yf.download(ALL_TICKERS, period="10y", auto_adjust=True, progress=False)

    # yfinance returns MultiIndex columns: (Price, Ticker)
    # Extract Close prices only
    if isinstance(raw.columns, pd.MultiIndex):
        df = raw["Close"]
    else:
        # Single ticker fallback (shouldn't happen with 27 tickers)
        df = raw[["Close"]]

    if df.empty:
        raise RuntimeError(
            "yfinance returned no data. Check your internet connection "
            "or try again in a few minutes."
        )

    # Drop rows where ALL tickers are NaN
    df = df.dropna(how="all")

    # Remove tickers with insufficient history (< 3 years daily obs, per notebook)
    valid_cols = df.count() >= MIN_OBS
    df = df.loc[:, valid_cols]

    # Forward-fill small internal gaps (per notebook)
    df = df.ffill()

    df.to_parquet(CACHE_FILE)
    with open(CACHE_META, "w") as f:
        json.dump({"timestamp": time.time()}, f)
    return df


def prepare_data(selected_classes: list[str]) -> dict:
    """
    Prepare monthly returns and compute expected returns / covariance
    for the selected asset classes using a 60-month rolling window.
    """
    prices = fetch_prices()

    # Filter tickers by selected classes, keeping only those present in price data
    tickers = []
    for cls in selected_classes:
        tickers.extend(UNIVERSE.get(cls, []))
    tickers = sorted(set(tickers) & set(prices.columns))

    if len(tickers) < 2:
        return {"tickers": [], "mu": np.array([]), "cov": np.array([[]]),
                "returns": np.array([[]]), "ticker_classes": {}}

    prices = prices[tickers].dropna(how="all")

    # Resample to month-end prices; only drop rows where ALL tickers are NaN
    monthly = prices.resample("ME").last().dropna(how="all")

    # Monthly returns; only drop rows where ALL values are NaN
    returns = monthly.pct_change().dropna(how="all")

    # Use most recent 60-month window (per notebook: window = 60)
    window = 60
    if len(returns) > window:
        returns = returns.iloc[-window:]

    # Drop tickers with insufficient monthly data (need at least 12 observations)
    # This mirrors the notebook's valid_tickers check per estimation window
    valid = returns.columns[returns.notna().sum() >= 12]
    returns = returns[valid]

    # Drop rows where ALL remaining tickers are NaN
    returns = returns.dropna(how="all")

    # Fill remaining NaNs per-ticker with 0
    # (handles short-history tickers like SGOV/IBIT, consistent with notebook's skipna approach)
    returns = returns.fillna(0)

    # Annualized expected returns (mean monthly * 12, per notebook)
    mu = returns.mean() * 12

    # Annualized covariance (monthly cov * 12, per notebook)
    cov = returns.cov() * 12

    return {
        "tickers": list(returns.columns),
        "mu": mu.values,
        "cov": cov.values,
        "returns": returns.values,  # T x N matrix of monthly returns
        "ticker_classes": {t: TICKER_TO_CLASS[t] for t in returns.columns},
    }
