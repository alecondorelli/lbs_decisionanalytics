"""Gurobi portfolio optimization — aligned with Group 8 notebook logic."""

import numpy as np
import gurobipy as gp
from gurobipy import GRB

DEFENSIVE_CLASSES = {"Fixed Income & Bonds", "Defensive Sectors"}


def optimize_portfolio(
    mu: np.ndarray,
    cov: np.ndarray,
    historical_returns: np.ndarray,
    tickers: list[str],
    ticker_classes: dict[str, str],
    budget: float,
    risk_tolerance: str,
    max_assets: int,
    num_selected_classes: int = 1,
) -> dict:
    """
    Solve the portfolio optimization problem.

    Objective: maximize  expected_return − lambda_risk * CVaR

    Constraints:
    - Weights sum to 1, each in [0, max_weight=0.25]
    - Cardinality: min 2, max max_assets assets (big-M)
    - CVaR computed via block-bootstrap scenario set (500 scenarios, block_size=3)
    - Asset class diversity: min classes based on user selection breadth
    - Defensive allocation: min % in bonds/defensive based on risk tolerance
    """
    n = len(tickers)

    # Lambda mapping
    lambda_map = {
        "low": 0.8, "conservative": 0.8,
        "medium": 0.5, "moderate": 0.5,
        "high": 0.3, "aggressive": 0.3,
    }
    lambda_risk = lambda_map.get(risk_tolerance.lower(), 0.5)
    print(f"[OPTIMIZER] risk_tolerance='{risk_tolerance}' → lambda_risk={lambda_risk}")

    max_weight = 0.25

    beta = 0.95
    S = 500
    block_size = 3

    # Block bootstrap scenario generation
    np.random.seed(42)
    T = historical_returns.shape[0]
    scenario_returns = []
    for _ in range(S):
        start_idx = np.random.randint(0, T - block_size)
        block = historical_returns[start_idx: start_idx + block_size]
        scenario_returns.append(block[0])
    scenarios = np.array(scenario_returns)  # shape (S, n)

    # Identify defensive tickers and asset class structure
    defensive_indices = [i for i, t in enumerate(tickers) if ticker_classes.get(t) in DEFENSIVE_CLASSES]
    unique_classes = sorted(set(ticker_classes[t] for t in tickers))
    class_to_indices: dict[str, list[int]] = {}
    for i, t in enumerate(tickers):
        cls = ticker_classes[t]
        class_to_indices.setdefault(cls, []).append(i)

    model = gp.Model("portfolio")
    model.setParam("OutputFlag", 0)
    model.setParam("TimeLimit", 60)

    # Decision variables
    w = model.addVars(n, lb=0, ub=max_weight, name="w")
    y = model.addVars(n, vtype=GRB.BINARY, name="y")
    alpha = model.addVar(lb=-GRB.INFINITY, name="alpha")
    z = model.addVars(S, lb=0, name="z")

    # CVaR expression (monthly)
    CVaR = alpha + (1.0 / ((1 - beta) * S)) * gp.quicksum(z[s] for s in range(S))

    # Expected return (annualized)
    expected_return = gp.quicksum(mu[i] * w[i] for i in range(n))

    # Objective: maximize return − lambda * CVaR
    model.setObjective(expected_return - lambda_risk * CVaR, GRB.MAXIMIZE)

    # Weights sum to 1
    model.addConstr(gp.quicksum(w[i] for i in range(n)) == 1, "budget")

    # Cardinality constraints
    for i in range(n):
        model.addConstr(w[i] <= max_weight * y[i], f"link_upper_{i}")
        model.addConstr(w[i] >= (1e-4) * y[i], f"link_lower_{i}")

    model.addConstr(gp.quicksum(y[i] for i in range(n)) >= 2, "min_assets")
    model.addConstr(gp.quicksum(y[i] for i in range(n)) <= max_assets, "max_assets")

    # --- Asset class diversity constraint ---
    if len(unique_classes) >= 2:
        class_used = {}
        for cls in unique_classes:
            indices = class_to_indices[cls]
            cv = model.addVar(vtype=GRB.BINARY, name=f"cls_{cls}")
            class_used[cls] = cv
            model.addConstr(cv <= gp.quicksum(y[i] for i in indices), f"cls_link_lo_{cls}")
            model.addConstr(cv * len(indices) >= gp.quicksum(y[i] for i in indices), f"cls_link_hi_{cls}")

        if num_selected_classes >= 5:
            min_classes = 3
        elif num_selected_classes >= 3:
            min_classes = 2
        else:
            min_classes = 0

        if min_classes > 0:
            model.addConstr(
                gp.quicksum(class_used[cls] for cls in unique_classes) >= min_classes,
                "min_class_diversity",
            )
            print(f"[OPTIMIZER] Class diversity constraint: >= {min_classes} classes from {len(unique_classes)} available")

    # --- Defensive allocation constraint ---
    defensive_min_map = {
        "low": 0.30, "conservative": 0.30,
        "medium": 0.10, "moderate": 0.10,
        "high": 0.0, "aggressive": 0.0,
    }
    min_defensive = defensive_min_map.get(risk_tolerance.lower(), 0.10)

    if defensive_indices and min_defensive > 0:
        model.addConstr(
            gp.quicksum(w[i] for i in defensive_indices) >= min_defensive,
            "min_defensive",
        )
        print(f"[OPTIMIZER] Defensive allocation constraint: >= {min_defensive*100:.0f}% in {len(defensive_indices)} defensive tickers")

    # CVaR scenario constraints
    for s in range(S):
        loss_s = gp.quicksum(-scenarios[s, i] * w[i] for i in range(n))
        model.addConstr(z[s] >= loss_s - alpha, f"cvar_{s}")

    print(f"[OPTIMIZER] Calling model.optimize() with {n} assets, {S} scenarios...")
    model.optimize()
    print(f"[OPTIMIZER] Gurobi status={model.status}, solve_time={model.Runtime:.2f}s, obj={model.ObjVal:.6f}")

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
    rf = 0.02
    sharpe = (port_return - rf) / port_vol if port_vol > 0 else 0.0

    # CVaR (monthly → annualised)
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

    # Detect binding max_weight constraints
    capped_tickers = [tickers[i] for i in range(n) if abs(weights[i] - max_weight) < 0.005]

    # Asset class breakdown
    class_breakdown: dict[str, float] = {}
    for h in holdings:
        class_breakdown[h["asset_class"]] = class_breakdown.get(h["asset_class"], 0) + h["weight"]
    class_breakdown = {k: round(v, 1) for k, v in sorted(class_breakdown.items(), key=lambda x: -x[1])}

    # Defensive allocation
    defensive_alloc = sum(h["weight"] for h in holdings if h["asset_class"] in DEFENSIVE_CLASSES)

    # Top risk contributors
    risk_sorted = sorted(holdings, key=lambda h: h["volatility"], reverse=True)
    top_risk = [{"ticker": h["ticker"], "weight": h["weight"], "volatility": h["volatility"]} for h in risk_sorted[:3]]

    return {
        "expected_return": round(port_return * 100, 2),
        "volatility": round(port_vol * 100, 2),
        "sharpe_ratio": round(sharpe, 3),
        "cvar_95": round(cvar_annual * 100, 2),
        "holdings": holdings,
        "budget": budget,
        "lambda_risk": lambda_risk,
        "max_weight_pct": max_weight * 100,
        "capped_tickers": capped_tickers,
        "portfolio_analysis": {
            "asset_class_breakdown": class_breakdown,
            "top_risk_contributors": top_risk,
            "defensive_allocation": round(defensive_alloc, 1),
            "concentration": round(holdings[0]["weight"], 1) if holdings else 0,
        },
    }


def compute_benchmarks(mu: np.ndarray, cov: np.ndarray, tickers: list[str]) -> list[dict]:
    """Compute risk/return for VOO, BND, and 60/40 benchmarks (per notebook)."""
    rf = 0.02
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
