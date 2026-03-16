"""FastAPI backend for portfolio optimization."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd

from data import prepare_data, fetch_prices, UNIVERSE, TICKER_TO_CLASS
from optimizer import optimize_portfolio, compute_benchmarks, DEFENSIVE_CLASSES

app = FastAPI(title="Portfolio Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizeRequest(BaseModel):
    budget: float = Field(gt=0, description="Total investment budget in USD")
    risk_tolerance: str = Field(description="low, medium, or high")
    max_assets: int = Field(ge=2, le=10, description="Maximum number of assets")
    selected_asset_classes: list[str] = Field(
        min_length=1, description="List of asset class names"
    )


class HoldingResponse(BaseModel):
    ticker: str
    asset_class: str
    weight: float
    dollar_amount: float
    expected_return: float
    volatility: float


class BenchmarkResponse(BaseModel):
    name: str
    expected_return: float
    volatility: float
    sharpe_ratio: float


class RiskContributor(BaseModel):
    ticker: str
    weight: float
    volatility: float


class PortfolioAnalysis(BaseModel):
    asset_class_breakdown: dict[str, float]
    top_risk_contributors: list[RiskContributor]
    defensive_allocation: float
    concentration: float


class BacktestData(BaseModel):
    dates: list[str]
    portfolio: list[float]
    voo: list[float]
    bnd: list[float]
    blend_60_40: list[float]


class OptimizeResponse(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float
    cvar_95: float
    holdings: list[HoldingResponse]
    benchmarks: list[BenchmarkResponse]
    budget: float
    explanation: str
    portfolio_analysis: PortfolioAnalysis
    backtest: BacktestData


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/asset-classes")
def get_asset_classes():
    """Return available asset classes and their ETFs."""
    return {
        "asset_classes": {
            name: tickers for name, tickers in UNIVERSE.items()
        }
    }


@app.get("/etf-scatter")
def etf_scatter():
    """Return annualized return and volatility for every ETF in the universe."""
    data = prepare_data(list(UNIVERSE.keys()))
    tickers = data["tickers"]
    mu = data["mu"]
    cov = data["cov"]

    etfs = []
    for i, ticker in enumerate(tickers):
        vol = float(np.sqrt(cov[i][i]))
        etfs.append({
            "ticker": ticker,
            "asset_class": TICKER_TO_CLASS.get(ticker, "Unknown"),
            "annual_return": round(float(mu[i]) * 100, 2),
            "annual_volatility": round(vol * 100, 2),
        })

    return {"etfs": etfs}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    # Validate asset classes
    valid_classes = set(UNIVERSE.keys())
    invalid = set(req.selected_asset_classes) - valid_classes
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset classes: {invalid}. Valid: {valid_classes}",
        )

    try:
        data = prepare_data(req.selected_asset_classes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data error: {str(e)}")

    if len(data["tickers"]) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 valid tickers. Select more asset classes.",
        )

    print(f"[MAIN] /optimize called: risk_tolerance='{req.risk_tolerance}', budget={req.budget}, max_assets={req.max_assets}")
    print(f"[MAIN] tickers passed to optimizer: {data['tickers']}")

    try:
        result = optimize_portfolio(
            mu=data["mu"],
            cov=data["cov"],
            historical_returns=data["returns"],
            tickers=data["tickers"],
            ticker_classes=data["ticker_classes"],
            budget=req.budget,
            risk_tolerance=req.risk_tolerance,
            max_assets=req.max_assets,
            num_selected_classes=len(req.selected_asset_classes),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

    # Compute benchmarks using the full data (need VOO and BND)
    try:
        bench_data = prepare_data(list(UNIVERSE.keys()))
        benchmarks = compute_benchmarks(
            bench_data["mu"], bench_data["cov"], bench_data["tickers"]
        )
    except Exception:
        benchmarks = []

    # Generate explanation
    explanation = _generate_explanation(req, result, benchmarks)

    # Compute historical backtest
    backtest = _compute_backtest(result["holdings"], req.budget)

    result["benchmarks"] = benchmarks
    result["explanation"] = explanation
    result["backtest"] = backtest

    return result


def _compute_backtest(holdings: list[dict], budget: float) -> dict:
    """Compute 3-year historical backtest using cached price data."""
    prices = fetch_prices()  # uses cache, no API call

    # Get monthly returns for all available tickers
    monthly = prices.resample("ME").last().dropna(how="all")
    monthly_returns = monthly.pct_change().dropna(how="all")

    # Last 36 months
    bt_returns = monthly_returns.iloc[-36:]

    # Portfolio weights vector (only for tickers present in price data)
    port_tickers = [h["ticker"] for h in holdings if h["ticker"] in bt_returns.columns]
    port_weights = {h["ticker"]: h["weight"] / 100.0 for h in holdings if h["ticker"] in bt_returns.columns}

    # Renormalize weights to sum to 1 (in case some tickers were dropped)
    w_sum = sum(port_weights.values())
    if w_sum > 0:
        port_weights = {t: w / w_sum for t, w in port_weights.items()}

    # Compute portfolio monthly returns
    port_monthly = pd.Series(0.0, index=bt_returns.index)
    for ticker, weight in port_weights.items():
        col = bt_returns[ticker].fillna(0)
        port_monthly += weight * col

    # Benchmark returns
    voo_monthly = bt_returns["VOO"].fillna(0) if "VOO" in bt_returns.columns else pd.Series(0.0, index=bt_returns.index)
    bnd_monthly = bt_returns["BND"].fillna(0) if "BND" in bt_returns.columns else pd.Series(0.0, index=bt_returns.index)
    blend_monthly = 0.6 * voo_monthly + 0.4 * bnd_monthly

    # Cumulative value series starting at budget
    def cumulative(returns_series: pd.Series) -> list[float]:
        values = [budget]
        for r in returns_series:
            values.append(round(values[-1] * (1 + r), 2))
        return values

    port_values = cumulative(port_monthly)
    voo_values = cumulative(voo_monthly)
    bnd_values = cumulative(bnd_monthly)
    blend_values = cumulative(blend_monthly)

    # Dates: start with the month before the first return, then each return month
    start_date = bt_returns.index[0] - pd.DateOffset(months=1)
    dates = [start_date.strftime("%Y-%m")]
    dates += [d.strftime("%Y-%m") for d in bt_returns.index]

    return {
        "dates": dates,
        "portfolio": port_values,
        "voo": voo_values,
        "bnd": bnd_values,
        "blend_60_40": blend_values,
    }


def _generate_explanation(req: OptimizeRequest, result: dict, benchmarks: list) -> str:
    """Generate a detailed, data-driven explanation of the optimization result."""
    risk_desc = {
        "low": "conservative", "conservative": "conservative",
        "medium": "moderate", "moderate": "moderate",
        "high": "aggressive", "aggressive": "aggressive",
    }.get(req.risk_tolerance.lower(), "moderate")

    lambda_risk = result.get("lambda_risk", 0.5)
    max_wt = result.get("max_weight_pct", 25)
    capped = result.get("capped_tickers", [])
    holdings = result["holdings"]
    analysis = result.get("portfolio_analysis", {})
    n_holdings = len(holdings)

    paragraphs = []

    # P1: Objective and method
    paragraphs.append(
        f"The optimizer used a {risk_desc} risk profile (λ = {lambda_risk}) to maximize "
        f"expected return minus {lambda_risk}× CVaR across 500 block-bootstrapped market scenarios. "
        f"With a ${req.budget:,.0f} budget and a maximum of {req.max_assets} assets allowed, "
        f"it selected {n_holdings} holdings."
    )

    # P2: Top holdings and why
    top = holdings[:3]
    top_lines = []
    for h in top:
        top_lines.append(
            f"{h['ticker']} ({h['asset_class']}) at {h['weight']:.1f}% — "
            f"expected return {h['expected_return']:+.1f}%, volatility {h['volatility']:.1f}%"
        )
    paragraphs.append(
        "Top allocations: " + "; ".join(top_lines) + ". "
        "These were selected for their favorable risk-adjusted return profiles "
        "within the CVaR-penalized objective."
    )

    # P3: Binding constraints
    constraint_notes = []
    if capped:
        constraint_notes.append(
            f"the {max_wt:.0f}% per-asset cap was binding for {', '.join(capped)}"
        )
    defensive_alloc = analysis.get("defensive_allocation", 0)
    if defensive_alloc > 0:
        constraint_notes.append(
            f"defensive allocation (bonds + defensive sectors) is {defensive_alloc:.1f}%"
        )
    if constraint_notes:
        paragraphs.append("Constraint details: " + "; ".join(constraint_notes) + ".")

    # P4: Asset class distribution
    breakdown = analysis.get("asset_class_breakdown", {})
    if breakdown:
        dist_parts = [f"{cls} {wt:.1f}%" for cls, wt in breakdown.items()]
        paragraphs.append("Asset class distribution: " + ", ".join(dist_parts) + ".")

    # P5: Performance vs benchmarks
    port_sharpe = result["sharpe_ratio"]
    paragraphs.append(
        f"The portfolio targets {result['expected_return']:.1f}% annual return with "
        f"{result['volatility']:.1f}% volatility (Sharpe {port_sharpe:.2f}). "
        f"The 95% CVaR is {result['cvar_95']:.1f}%, meaning the expected loss "
        f"in the worst 5% of scenarios is contained within this threshold."
    )

    if benchmarks:
        comparisons = []
        for b in benchmarks:
            beat = "outperforms" if port_sharpe > b["sharpe_ratio"] else "trails"
            comparisons.append(f"{beat} {b['name']} (Sharpe {b['sharpe_ratio']:.2f})")
        paragraphs.append("Benchmark comparison: the portfolio " + ", ".join(comparisons) + ".")

    return "\n\n".join(paragraphs)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
