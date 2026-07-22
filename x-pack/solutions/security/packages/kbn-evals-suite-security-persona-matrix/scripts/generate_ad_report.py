#!/usr/bin/env python3
"""Generate attack_discovery_results.html from local ES eval scores.

Self-contained: includes the HTML renderer inline (ported from Dhru's
render_attack_discovery_html.py) so no external file dependency is needed.

Fetches Attack Discovery results from local ES (:9222), transforms to
JSONL format, and renders a dark-mode HTML report with:
  - Summary table per model (status, discoveries, alerts, latency, risk)
  - Per-model detail cards with expandable discovery evidence
"""

import json
import base64
import html
import os
import re
import sys
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

LOCAL_ES = os.environ.get("KBN_EVALS_ES_URL", "http://localhost:9222")
LOCAL_ES_USER = os.environ.get("KBN_EVALS_ES_USER", "elastic")
LOCAL_ES_PASS = os.environ.get("KBN_EVALS_ES_PASS", "changeme")

HERE = Path(__file__).resolve().parent
OUTPUT_DIR = HERE

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


# ─── ES fetching ──────────────────────────────────────────────────────────

def fetch_ad_results():
    """Fetch Attack Discovery results from ES."""
    auth = base64.b64encode(f"{LOCAL_ES_USER}:{LOCAL_ES_PASS}".encode()).decode()
    body = json.dumps({
        "query": {"term": {"experiment_name": "Attack Discovery All Scenarios"}},
        "_source": [
            "task.output", "task.model", "task.trace_id",
            "example.id", "example.index", "example.input",
            "evaluator.name", "evaluator.score",
            "metadata",
        ],
        "size": 500,
    }).encode()

    req = urllib.request.Request(
        f"{LOCAL_ES}/.evaluation-scores*/_search",
        data=body,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"Error fetching from ES: {e}", file=sys.stderr)
        return None

    hits = data.get("hits", {}).get("hits", [])

    # Deduplicate by example index — keep the doc with most insights
    by_example = {}
    for h in hits:
        src = h["_source"]
        ex_idx = src.get("example", {}).get("index", 0)
        output = src.get("task", {}).get("output", {})
        insights = output.get("insights", []) if isinstance(output, dict) else []

        existing = by_example.get(ex_idx)
        if existing is None or len(insights) > len(existing.get("insights", [])):
            by_example[ex_idx] = {
                "output": output,
                "model": src.get("task", {}).get("model", {}),
                "trace_id": src.get("task", {}).get("trace_id", ""),
                "example_id": src.get("example", {}).get("id", str(ex_idx)),
                "input": src.get("example", {}).get("input", {}),
                "metadata": src.get("metadata", {}),
            }
    return by_example


def derive_model_name(model_info):
    """Derive a clean, human-readable model name from the model dict."""
    if not isinstance(model_info, dict):
        return str(model_info)
    model_id = model_info.get("id", "unknown")
    family = model_info.get("family", "")
    # Strip vendor prefixes from model_id for a clean name
    # e.g. "anthropic-claude-4.5-haiku" -> "Claude 4.5 Haiku"
    parts = model_id.split("-")
    # Remove known vendor prefixes
    vendors = {"anthropic", "openai", "google", "mistral", "meta"}
    parts = [p for p in parts if p.lower() not in vendors]
    if parts:
        name = " ".join(p.capitalize() for p in parts)
        # Handle version-like patterns (4.5 should stay as-is)
        name = re.sub(r'\b(\d+)\b', r'\1', name)  # keep version numbers
        if family and family.lower() not in name.lower():
            name = f"{family} {name}"
        return name
    return family or model_id


def build_jsonl_rows(by_example):
    """Transform ES results to AD JSONL format."""
    rows = []
    for ex_idx in sorted(by_example.keys()):
        data = by_example[ex_idx]
        output = data.get("output", {})
        insights = output.get("insights", []) if isinstance(output, dict) else []
        model_info = data.get("model", {})

        model_id = model_info.get("id", "unknown") if isinstance(model_info, dict) else str(model_info)
        model_name = derive_model_name(model_info)

        discoveries = []
        for ins in insights:
            if not isinstance(ins, dict):
                continue
            disc = {
                "title": ins.get("title", "Untitled"),
                "summary_markdown": ins.get("summary", ins.get("description", "")),
                "details_markdown": ins.get("details", ins.get("summary", "")),
                "mitre_attack_tactics": ins.get("mitre_tactics", ins.get("tactics", [])),
                "risk_score": ins.get("risk_score", ins.get("risk", 0)),
                "alert_ids": ins.get("alerts", ins.get("alert_ids", [])),
            }
            discoveries.append(disc)

        rows.append({
            "model_name": model_name,
            "model_id": model_id,
            "connector_id": f"eis-{model_id}",
            "execution_uuid": data.get("example_id", str(ex_idx)),
            "status": "succeeded" if insights else "succeeded_empty",
            "discovery_count": len(discoveries),
            "alerts_context_count": len(data.get("input", {}).get("anonymizedAlerts", [])),
            "discoveries": discoveries,
            "latency_ms": output.get("latency_ms", 0) if isinstance(output, dict) else 0,
            "error": "",
            "_metadata": data.get("metadata", {}),
        })
    return rows


# ─── HTML rendering (ported from Dhru's render_attack_discovery_html.py) ──

def md_inline(text):
    """Minimal, safe inline markdown -> HTML."""
    escaped = html.escape(text or "")
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    return escaped


def md_block(text):
    """Render a small markdown block (bullet lists + inline) to HTML."""
    if not text:
        return ""
    lines = text.splitlines()
    out = []
    in_list = False
    for raw in lines:
        line = raw.rstrip()
        stripped = line.lstrip()
        is_bullet = stripped.startswith(("- ", "* "))
        if is_bullet:
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{md_inline(stripped[2:])}</li>")
        else:
            if in_list:
                out.append("</ul>")
                in_list = False
            if stripped:
                out.append(f"<p>{md_inline(stripped)}</p>")
    if in_list:
        out.append("</ul>")
    return "\n".join(out)


SEVERITY_BANDS = [
    (1000, "crit", "Critical"),
    (500, "high", "High"),
    (250, "med", "Medium"),
    (0, "low", "Low"),
]


def risk_band(score):
    if score is None:
        return ("low", "n/a")
    for threshold, cls, label in SEVERITY_BANDS:
        if score >= threshold:
            return (cls, label)
    return ("low", "Low")


def tactic_chips(tactics):
    if not tactics:
        return ""
    return "".join(f'<span class="chip">{html.escape(t)}</span>' for t in tactics)


def render_ad_html(rows):
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Extract provenance
    commit_sha = "unknown"
    branch = "unknown"
    for r in rows[:1]:
        meta = r.get("_metadata", {})
        git_info = meta.get("git", {})
        commit_sha = git_info.get("commit_sha", "unknown")[:12]
        branch = git_info.get("branch", "unknown")

    # Summary table rows
    summary_rows = []
    for r in rows:
        latency_s = (r.get("latency_ms") or 0) / 1000.0
        total_risk = sum((d.get("risk_score") or 0) for d in (r.get("discoveries") or []))
        err = r.get("error") or ""
        status = r.get("status") or ("error" if err else "")
        status_cls = "ok" if status == "succeeded" else ("err" if err else "warn")
        summary_rows.append(f"""
            <tr>
              <td class="model">{html.escape(r.get('model_name', ''))}<br>
                <span class="model-id">{html.escape(r.get('model_id', ''))}</span></td>
              <td><span class="status {status_cls}">{html.escape(status or '—')}</span></td>
              <td class="num">{r.get('discovery_count', 0)}</td>
              <td class="num">{r.get('alerts_context_count', '') or '—'}</td>
              <td class="num">{latency_s:.1f}s</td>
              <td class="num">{total_risk:,}</td>
            </tr>""")

    # Per-model detail cards
    cards = []
    for r in rows:
        discoveries = r.get("discoveries") or []
        disc_html = []
        for i, d in enumerate(discoveries, 1):
            score = d.get("risk_score")
            band_cls, band_label = risk_band(score)
            n_alerts = len(d.get("alert_ids") or [])
            disc_html.append(f"""
                <details class="disc" open>
                  <summary>
                    <span class="disc-num">{i}</span>
                    <span class="disc-title">{html.escape(d.get('title', '(untitled)'))}</span>
                    <span class="risk {band_cls}" title="risk score">{band_label} · {score if score is not None else '—'}</span>
                    <span class="alert-count">{n_alerts} alert{'s' if n_alerts != 1 else ''}</span>
                  </summary>
                  <div class="disc-body">
                    <div class="chips">{tactic_chips(d.get('mitre_attack_tactics') or [])}</div>
                    <p class="summary">{md_inline(d.get('summary_markdown', ''))}</p>
                    <div class="details">{md_block(d.get('details_markdown', ''))}</div>
                  </div>
                </details>""")
        if not discoveries:
            note = html.escape(r.get("error") or "No discoveries generated.")
            disc_html.append(f'<p class="empty">{note}</p>')

        latency_s = (r.get("latency_ms") or 0) / 1000.0
        cards.append(f"""
            <section class="card">
              <header class="card-head">
                <h2>{html.escape(r.get('model_name', ''))}</h2>
                <div class="meta">
                  <span>{r.get('discovery_count', 0)} discoveries</span>
                  <span>·</span>
                  <span>{latency_s:.1f}s</span>
                  <span>·</span>
                  <span>{r.get('alerts_context_count', '') or '—'} alerts in context</span>
                </div>
              </header>
              {''.join(disc_html)}
            </section>""")

    html_out = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Attack Discovery &mdash; EIS Model Trial</title>
<style>
  :root {{
    color-scheme: dark;
    --bg: #0e1014; --panel: #14171e; --panel2: #1c212c;
    --border: #232a36; --text: #e8ebf2; --muted: #8b94a3;
    --accent: #6ea8fe; --low: #5fd0a0; --med: #ffd166;
    --high: #ff9f43; --crit: #ff5d6c;
  }}
  * {{ box-sizing: border-box; }}
  body {{ font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    margin:0; background:var(--bg); color:var(--text); padding:40px 20px 80px; text-align:center; }}
  .wrap {{ max-width:1100px; margin:0 auto; text-align:left; }}
  h1 {{ font-size:24px; font-weight:700; margin:0 0 6px; letter-spacing:-.01em; text-align:center; }}
  .sub {{ color:var(--muted); font-size:14px; margin:0 auto 32px; max-width:760px; text-align:center; }}
  table {{ border-collapse:collapse; background:var(--panel);
    border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:32px; width:100%; }}
  th,td {{ padding:10px 14px; text-align:left; border-bottom:1px solid var(--border); }}
  th {{ background:var(--panel2); color:var(--muted); font-size:12px;
    text-transform:uppercase; letter-spacing:.04em; }}
  tr:last-child td {{ border-bottom:none; }}
  td.num {{ text-align:right; font-variant-numeric:tabular-nums; }}
  td.model {{ font-weight:600; }}
  .model-id {{ color:var(--muted); font-weight:400; font-size:12px; font-family:ui-monospace,monospace; }}
  .status {{ padding:2px 8px; border-radius:20px; font-size:12px; font-weight:600; }}
  .status.ok {{ background:rgba(95,208,160,.15); color:var(--low); }}
  .status.err {{ background:rgba(255,93,108,.15); color:var(--crit); }}
  .status.warn {{ background:rgba(255,209,102,.15); color:var(--med); }}
  .card {{ background:var(--panel); border:1px solid var(--border);
    border-radius:12px; padding:18px 20px; margin-bottom:22px; }}
  .card-head {{ display:flex; align-items:baseline; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-bottom:10px; }}
  .card-head h2 {{ font-size:18px; margin:0; }}
  .meta {{ color:var(--muted); font-size:13px; display:flex; gap:8px; flex-wrap:wrap; }}
  details.disc {{ border:1px solid var(--border); border-radius:9px;
    margin-top:10px; background:var(--panel2); }}
  details.disc summary {{ list-style:none; cursor:pointer; padding:11px 14px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap; }}
  details.disc summary::-webkit-details-marker {{ display:none; }}
  .disc-num {{ width:22px; height:22px; flex:none; border-radius:50%;
    background:var(--border); color:var(--text); display:grid; place-items:center;
    font-size:12px; font-weight:700; }}
  .disc-title {{ font-weight:600; flex:1 1 auto; min-width:200px; }}
  .risk {{ font-size:12px; font-weight:700; padding:2px 9px; border-radius:20px; flex:none; }}
  .risk.crit {{ background:rgba(255,93,108,.18); color:var(--crit); }}
  .risk.high {{ background:rgba(255,159,67,.18); color:var(--high); }}
  .risk.med {{ background:rgba(255,209,102,.18); color:var(--med); }}
  .risk.low {{ background:rgba(95,208,160,.18); color:var(--low); }}
  .alert-count {{ font-size:12px; color:var(--muted); flex:none; }}
  .disc-body {{ padding:0 14px 14px; border-top:1px solid var(--border); }}
  .chips {{ margin:12px 0 8px; display:flex; gap:6px; flex-wrap:wrap; }}
  .chip {{ font-size:11px; background:rgba(110,168,254,.14); color:var(--accent);
    border:1px solid rgba(110,168,254,.25); padding:2px 9px; border-radius:20px; }}
  .summary {{ font-weight:500; margin:6px 0 10px; }}
  .details p {{ margin:6px 0; color:var(--text); }}
  .details ul {{ margin:6px 0; padding-left:20px; }}
  .details li {{ margin:5px 0; color:#cdd3dd; }}
  code {{ background:rgba(255,255,255,.07); padding:1px 5px; border-radius:5px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#ffd9a8; }}
  .empty {{ color:var(--muted); font-style:italic; padding:8px 0; }}
  .legend {{ color:var(--muted); font-size:12px; margin:-12px 0 24px; }}
  .provenance {{ color:var(--muted); font-size:12px; text-align:center; margin-top:36px;
    border-top:1px solid var(--border); padding-top:16px; }}
  .provenance code {{ font-size:11px; }}
</style>
</head>
<body>
<div class="wrap">
  <h1>Attack Discovery — EIS Model Trial</h1>
  <p class="sub">Same alert context (last 24h, <code>.alerts-security.alerts-default</code>) run through each EIS connector via <code>/api/attack_discovery/_generate</code>. Generated {generated_at}.</p>

  <table>
    <thead>
      <tr><th>Model</th><th>Status</th><th>Discoveries</th><th>Alerts in context</th><th>Latency</th><th>Total risk</th></tr>
    </thead>
    <tbody>{''.join(summary_rows)}</tbody>
  </table>
  <p class="legend">Risk bands: Critical ≥ 1000 · High ≥ 500 · Medium ≥ 250 · Low &lt; 250 (sum of per-discovery risk scores). Click any discovery to expand its evidence chain.</p>

  {''.join(cards)}

  <div class="provenance">
    commit: <code>{commit_sha}</code> · branch: <code>{branch}</code> · generated {generated_at}
  </div>
</div>
</body>
</html>"""
    return html_out


def main():
    # Try fetching from ES, fall back to cached JSONL
    jsonl_path = HERE / "attack_discovery_results.jsonl"

    by_example = fetch_ad_results()
    if by_example is None:
        print("  ES unavailable, checking for cached JSONL...")
        if jsonl_path.exists():
            with open(jsonl_path) as f:
                rows = [json.loads(l) for l in f]
            print(f"  Loaded {len(rows)} rows from cached JSONL")
        else:
            print("FATAL: Could not fetch from ES and no cached JSONL found", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"  Found {len(by_example)} unique examples")
        rows = build_jsonl_rows(by_example)
        print(f"  Built {len(rows)} JSONL rows")
        total_disc = sum(r["discovery_count"] for r in rows)
        print(f"  Total discoveries: {total_disc}")

        with open(jsonl_path, "w") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(f"Wrote {jsonl_path}")

    # Render HTML
    html_path = HERE / "attack_discovery_results.html"
    html_out = render_ad_html(rows)
    with open(html_path, "w") as f:
        f.write(html_out)
    print(f"  Wrote {html_path} ({len(html_out):,} bytes)")
    print(f"\n✅ Attack Discovery report generated.")


if __name__ == "__main__":
    main()
