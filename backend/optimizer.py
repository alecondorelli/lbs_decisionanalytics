"""Gurobi portfolio optimization — aligned with Group 8 notebook logic."""

import numpy as np
import gurobipy as gp
from gurobipy import GRB


def optimize_portfolio(
    mu: np.ndarray,
    cov: np.ndarray,
    historical_returns: np.ndarray,
    tickers: list[str],
    ticker_classes: dict[str, str],
    budget: float,
    risk_tolerance: str,
    max_assets: int,
) -> dict:
    """
    Solve the portfolio optimization problem.

    Objective: maximize  expected_return − lambda_risk * CVaR
    (penalized mean-CVaR, matching notebook's final formulation)

    Constraints:
    - Weights sum to 1, each in [0, max_weight=0.35]
    - Cardinality: min 2, max max_assets assets (big-M)
    - CVaR computed via block-bootstrap scenario set (500 scenarios, block_size=3)

    lambda_risk maps from user risk tolerance (grid search best params):
        low    → 0.8  (penalize risk heavily → conservative)
        medium → 0.5  (balanced, best Sharpe in grid search)
        high   → 0.3  (penalize risk lightly → aggressive)

    beta (CVaR confidence level) = 0.95 per notebook.
    max_weight = 0.35 per notebook's best grid-search parameter.
    risk-free rate = 0.02 per notebook.
    """
    n = len(tickers)

    # Lambda mapping from grid-search results (window=60, beta=0.95 best combo)
    lambda_map = {"low": 0.8, "medium": 0.5, "high": 0.3}
    lambda_risk = lambda_map.get(risk_tolerance.lower(), 0.5)

    # Per notebook best params: max_weight=0.35
    max_weight = 0.35

    beta = 0.95
    S = 500
    block_size = 3  # notebook's final scenario method: block bootstrap

    # -------------------------------------------------------
    # Block bootstrap scenario generation (notebook final version)
    # Uses historical monthly returns, block_size=3
    np.random.seed(42)
    T = historical_returns.shape[0]
    scenario_returns = []
    for _ in range(S):
        start_idx = np.random.randint(0, T - block_size)
        block = historical_returns[start_idx: start_idx + block_size]
        scenario_returns.append(block[0])  # use first month of block
    scenarios = np.array(scenario_returns)  # shape (S, n)
    # -------------------------------------------------------

    model = gp.Model("portfolio")
    model.setParam("OutputFlag", 0)
    model.setParam("TimeLimit", 60)

    # Decision variables
    w = model.addVars(n, lb=0, ub=max_weight, name="w")
    y = model.addVars(n, vtype=GRB.BINARY, name="y")  # asset selection indicator
    alpha = model.addVar(lb=-GRB.INFINITY, name="alpha")  # VaR level
    z = model.addVars(S, lb=0, name="z")                  # CVaR exceedance

    # CVaR expression (in return space, monthly)
    CVaR = alpha + (1.0 / ((1 - beta) * S)) * gp.quicksum(z[s] for s in range(S))

    # Expected return expression (annualized)
    expected_return = gp.quicksum(mu[i] * w[i] for i in range(n))

    # Objective: maximize return − lambda * CVaR (notebook formulation)
    model.setObjective(expected_return - lambda_risk * CVaR, GRB.MAXIMIZE)

    # Weights sum to 1
    model.addConstr(gp.quicksum(w[i] for i in range(n)) == 1, "budget")

    # Cardinality constraints (big-M = max_weight, per notebook logic)
    M_big = 100_000  # large enough relative to weight domain
    for i in range(n):
        model.addConstr(w[i] <= max_weight * y[i], f"link_upper_{i}")
        model.addConstr(w[i] >= (1e-4) * y[i], f"link_lower_{i}")

    model.addConstr(gp.quicksum(y[i] for i in range(n)) >= 2, "min_assets")
    model.addConstr(gp.quicksum(y[i] for i in range(n)) <= max_assets, "max_assets")

    # CVaR scenario constraints: z[s] >= loss_s − alpha  ∀s
    # Portfolio loss in scenario s = − sum_i( scenario_return[s,i] * w[i] )
    for s in range(S):
        loss_s = gp.quicksum(-scenarios[s, i] * w[i] for i in range(n))
        model.addConstr(z[s] >= loss_s - alpha, f"cvar_{s}")

    model.optimize()

    if model.status != GRB.OPTIMAL:
        raise ValueError(
            f"Optimization failed (status {model.status}). "
            "Try a higher risk tolerance or select more asset classes."
        )

    # Extract weights
    weights = np.array([w[i].X for i in range(n)])
    weights[weights < 0.005] = 0
    if weights.sum() > 0:
        weights = weights / weights.sum()

    # Portfolio metrics
    port_return = float(weights @ mu)
    port_vol = float(np.sqrt(weights @ cov @ weights))
    rf = 0.02  # risk-free rate per notebook
    sharpe = (port_return - rf) / port_vol if port_vol > 0 else 0.0

    # CVaR: compute from scenario losses (monthly → annualised)
    port_losses = -(scenarios @ weights)
    sorted_losses = np.sort(port_losses)
    var_index = int(np.ceil(S * beta))
    cvar_monthly = float(np.mean(sorted_losses[var_index:]))
    cvar_annual = cvar_monthly * np.sqrt(12)

    # Build holdings list
    holdings = []
    for i in range(n):
        if weights[i] > 0.001:
            holdings.append({
                "ticker": tickers[i],
                "asset_class": ticker_classes[tickers[i]],
                "weight": round(float(weights[i]) * 100, 2),
                "dollar_amount": round(float(weights[i]) * budget, 2),
                "expected_return": round(float(mu[i]) * 100, 2),
                "volatility": round(float(np.sqrt(cov[i, i])) * 100, 2),
            })
    holdings.sort(key=lambda x: x["weight"], reverse=True)

    return {
        "expected_return": round(port_return * 100, 2),
        "volatility": round(port_vol * 100, 2),
        "sharpe_ratio": round(sharpe, 3),
        "cvar_95": round(cvar_annual * 100, 2),
        "holdings": holdings,
        "budget": budget,
    }


def compute_benchmarks(mu: np.ndarray, cov: np.ndarray, tickers: list[str]) -> list[dict]:
    """Compute risk/return for VOO, BND, and 60/40 benchmarks (per notebook)."""
    rf = 0.02  # per notebook
    benchmarks = []

    for name, alloc in [
        ("VOO (100% Equity)", {"VOO": 1.0}),
        ("BND (100% Bonds)", {"BND": 1.0}),
        ("60/40 Blend", {"VOO": 0.6, "BND": 0.4}),
    ]:
        w = np.zeros(len(tickers))
        valid = True
        for ticker, weight in alloc.items():
            if ticker in tickers:
                w[tickers.index(ticker)] = weight
            else:
                valid = False

        if valid and w.sum() > 0:
            ret = float(w @ mu) * 100
            vol = float(np.sqrt(w @ cov @ w)) * 100
            sharpe = ((ret / 100) - rf) / (vol / 100) if vol > 0 else 0
            benchmarks.append({
                "name": name,
                "expected_return": round(ret, 2),
                "volatility": round(vol, 2),
                "sharpe_ratio": round(sharpe, 3),
            })
    return benchmarks
