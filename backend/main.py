"""FastAPI backend for portfolio optimization."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

from data import prepare_data, fetch_prices, UNIVERSE
from optimizer import optimize_portfolio, compute_benchmarks

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


class OptimizeResponse(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float
    cvar_95: float
    holdings: list[HoldingResponse]
    benchmarks: list[BenchmarkResponse]
    budget: float
    explanation: str


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

    result["benchmarks"] = benchmarks
    result["explanation"] = explanation

    return result


def _generate_explanation(req: OptimizeRequest, result: dict, benchmarks: list) -> str:
    """Generate a plain-English explanation of the optimization result."""
    n_holdings = len(result["holdings"])
    top = result["holdings"][0]
    risk_desc = {
        "low": "conservative",
        "medium": "moderate",
        "high": "aggressive",
    }.get(req.risk_tolerance.lower(), "moderate")

    lines = [
        f"Based on your {risk_desc} risk profile and ${req.budget:,.0f} budget, "
        f"the optimizer selected {n_holdings} assets across your chosen asset classes.",
    ]

    lines.append(
        f"The largest allocation is {top['weight']:.1f}% to {top['ticker']} "
        f"({top['asset_class']}), reflecting its favorable risk-adjusted return."
    )

    lines.append(
        f"The portfolio targets an expected annual return of {result['expected_return']:.1f}% "
        f"with {result['volatility']:.1f}% volatility, yielding a Sharpe ratio of {result['sharpe_ratio']:.2f}."
    )

    if result["cvar_95"] > 0:
        lines.append(
            f"The 95% CVaR (Conditional Value at Risk) is {result['cvar_95']:.1f}%, "
            f"meaning in the worst 5% of scenarios, the expected monthly loss "
            f"is contained within this threshold — consistent with your {risk_desc} risk tolerance."
        )

    if benchmarks:
        port_sharpe = result["sharpe_ratio"]
        best_bench = max(benchmarks, key=lambda b: b["sharpe_ratio"])
        if port_sharpe > best_bench["sharpe_ratio"]:
            lines.append(
                f"This portfolio's Sharpe ratio ({port_sharpe:.2f}) exceeds the best "
                f"benchmark ({best_bench['name']}: {best_bench['sharpe_ratio']:.2f}), "
                f"indicating superior risk-adjusted performance through diversification."
            )

    return " ".join(lines)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
