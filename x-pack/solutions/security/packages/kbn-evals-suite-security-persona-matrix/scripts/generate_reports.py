#!/usr/bin/env python3
"""
Generate Dhru-style reports from real kbn-evals data:
  1. Fetch score docs from local ES (:9220)
  2. Enrich each example with golden cluster traces (tokens, latency, steps, tools)
  3. Output JSONL rows matching Dhru's schema
  4. Run Dhru's render_agent_eval_html.py for agent_eval_full.html
  5. Generate llm_persona_matrix.html
  6. Generate token_usage_overview_matrix.html
"""
import json, sys, os, ssl, subprocess, urllib.request, urllib.parse
from collections import defaultdict
from datetime import datetime, timezone

# Disable SSL verification for golden cluster (self-hosted Python doesn't trust the chain)
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

LOCAL_ES = "http://localhost:9222"
LOCAL_ES_USER = "elastic"
LOCAL_ES_PASS = "changeme"
GOLDEN_ES = "https://kbn-evals-serverless-ed035a.es.us-central1.gcp.elastic.cloud"
GOLDEN_API_KEY = os.environ.get("GOLDEN_ES_API_KEY", "d2Y2c2FaNEJuemU2S09kYkdmeGc6MGlseW9iLTU4LTFUNExrVEFmQTZtZw==")
DHRU_DIR = os.path.expanduser("~/Projects/agent-builder-skill-dev-cursor-plugin/dhru-eval-reports")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Category mapping
EXAMPLE_CATEGORY_MAP = {
    "alert-analysis": "C1",
    "detection-rule-edit": "C2",
    "entity-analytics": "C3",
    "threat-hunting": "C3",
    "workflow-authoring": "C4",
    "workflow-execution": "C4",
    "multi-step": "C5",
}

def resolve_category(example_id):
    for prefix, cat in EXAMPLE_CATEGORY_MAP.items():
        if example_id.startswith(prefix):
            return cat
    return "C1"

def es_request(url, body=None, api_key=None, basic_auth=None):
    """Make an ES request and return parsed JSON."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"ApiKey {api_key}"
    elif basic_auth:
        import base64
        headers["Authorization"] = "Basic " + base64.b64encode(basic_auth.encode()).decode()

    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}", file=sys.stderr)
        return None

def fetch_scores():
    """Fetch all score docs from local ES."""
    print("Fetching score docs from local ES...")
    url = f"{LOCAL_ES}/.evaluation-scores*/_search"
    body = {
        "size": 2000,
        "query": {"term": {"experiment_name": "security: security-persona-matrix"}},
        "sort": [{"@timestamp": "desc"}],
        "_source": [
            "example.id", "example.input.question",
            "task.trace_id", "task.repetition_index", "task.model",
            "task.output.response.message", "task.output.response.steps",
            "evaluator.name", "evaluator.score", "evaluator.label", "evaluator.explanation",
            "evaluator.metadata", "evaluator.model",
            "metadata",
        ]
    }
    data = es_request(url, body, basic_auth=f"{LOCAL_ES_USER}:{LOCAL_ES_PASS}")
    if not data:
        print("  Could not fetch scores (ES unreachable)", file=sys.stderr)
        return None

    hits = data.get("hits", {}).get("hits", [])
    print(f"  Fetched {len(hits)} score docs")
    return [h["_source"] for h in hits]

def fetch_trace_spans(trace_id):
    """Fetch trace spans from golden cluster."""
    url = f"{GOLDEN_ES}/traces-*/_search"
    body = {
        "size": 1000,
        "query": {"term": {"trace.id": trace_id}},
        "sort": [{"@timestamp": "asc"}],
        "_source": ["name", "@timestamp", "duration", "attributes"]
    }
    data = es_request(url, body, api_key=GOLDEN_API_KEY)
    if not data:
        return []
    hits = data.get("hits", {}).get("hits", [])
    return [h["_source"] for h in hits]

def extract_from_trace(spans):
    """Extract steps, tools, tokens, latency from golden cluster trace spans."""
    steps = []
    tools_called = []
    input_tokens = 0
    output_tokens = 0
    cached_tokens = 0
    max_latency_us = 0
    response_message = ""

    for span in spans:
        attrs = span.get("attributes", {})
        kind = attrs.get("elastic.inference.span.kind", "")
        op_name = attrs.get("gen_ai.operation.name", "")

        # Skip title-generation spans
        sys_instr = attrs.get("gen_ai.system_instructions", "")
        is_title_gen = "title-generation" in str(sys_instr)

        if not is_title_gen and (kind == "LLM" or (op_name == "chat" and span.get("name", "").startswith("chat "))):
            in_tok = attrs.get("gen_ai.usage.input_tokens")
            out_tok = attrs.get("gen_ai.usage.output_tokens")
            if isinstance(in_tok, (int, float)):
                input_tokens += int(in_tok)
            if isinstance(out_tok, (int, float)):
                output_tokens += int(out_tok)

            # Parse output messages
            out_msgs = attrs.get("gen_ai.output.messages")
            if isinstance(out_msgs, str):
                try:
                    out_msgs = json.loads(out_msgs)
                except:
                    out_msgs = None

            if isinstance(out_msgs, list):
                for msg in out_msgs:
                    if not isinstance(msg, dict):
                        continue
                    role = msg.get("role", "")
                    parts = msg.get("parts", [])
                    if role == "assistant" and isinstance(parts, list):
                        for p in parts:
                            if not isinstance(p, dict):
                                continue
                            ptype = p.get("type", "")
                            if ptype == "text" and p.get("content"):
                                response_message = p["content"]
                                steps.append({
                                    "type": "reasoning",
                                    "reasoning": p["content"][:200],
                                })
                            elif ptype == "tool_call" and p.get("name"):
                                steps.append({
                                    "type": "tool_call",
                                    "tool_id": p["name"],
                                    "params": json.loads(p["arguments"]) if p.get("arguments") else {},
                                })

            # Track latency (duration is in nanoseconds)
            duration = span.get("duration", 0)
            if isinstance(duration, (int, float)):
                latency_us = duration / 1000  # ns -> us
                if latency_us > max_latency_us:
                    max_latency_us = latency_us

        # Extract tool calls
        if kind == "TOOL" or (op_name == "execute_tool" and span.get("name", "").startswith("execute_tool ")):
            tool_name = attrs.get("gen_ai.tool.name", "")
            if tool_name and tool_name not in tools_called:
                tools_called.append(tool_name)

    latency_ms = round(max_latency_us / 1000)  # us -> ms
    return {
        "steps": steps,
        "tools_called": tools_called,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cached_tokens": cached_tokens,
        "latency_ms": latency_ms,
        "response_message": response_message,
    }

def group_scores(score_docs):
    """Group score docs by example::repetition_index."""
    groups = defaultdict(list)
    for doc in score_docs:
        ex_id = doc.get("example", {}).get("id", "?")
        rep = doc.get("task", {}).get("repetition_index", 0)
        key = f"{ex_id}::{rep}"
        groups[key].append(doc)
    return groups

def build_jsonl_rows(score_docs):
    """Build JSONL rows matching Dhru's schema, enriched with golden cluster traces."""
    groups = group_scores(score_docs)
    rows = []
    trace_cache = {}

    for key in sorted(groups.keys()):
        docs = groups[key]
        ex_id = key.split("::")[0]
        print(f"  Processing {ex_id}...", end="")

        # Get latest docs per evaluator
        latest = {}
        for d in docs:
            ev_name = d.get("evaluator", {}).get("name", "")
            if ev_name and ev_name not in latest:
                latest[ev_name] = d

        # Use any doc for common fields
        ref_doc = list(latest.values())[0] if latest else docs[0]
        trace_id = ref_doc.get("task", {}).get("trace_id", "")
        prompt_text = ref_doc.get("example", {}).get("input", {}).get("question", "")
        response_msg = ref_doc.get("task", {}).get("output", {}).get("response", {}).get("message", "")
        response_steps = ref_doc.get("task", {}).get("output", {}).get("response", {}).get("steps", [])

        # Extract evaluator scores
        criteria_score = None
        trajectory_score = None
        skill_invoked = None
        evaluator_label = "evaluated"

        for ev_name, d in latest.items():
            score = d.get("evaluator", {}).get("score")
            label = d.get("evaluator", {}).get("label", "")
            if ev_name == "criteria":
                criteria_score = score
                if label:
                    evaluator_label = label
            elif ev_name == "trajectory":
                trajectory_score = score
                if label and evaluator_label == "evaluated":
                    evaluator_label = label
            elif ev_name.startswith("Skill Invoked"):
                skill_invoked = score if score is not None else label

        # Enrich from golden cluster trace
        trace_data = None
        if trace_id:
            if trace_id not in trace_cache:
                spans = fetch_trace_spans(trace_id)
                if spans:
                    trace_cache[trace_id] = extract_from_trace(spans)
                else:
                    trace_cache[trace_id] = None
            trace_data = trace_cache[trace_id]

        if trace_data:
            steps = trace_data["steps"] if trace_data["steps"] else response_steps
            tools = trace_data["tools_called"]
            input_tok = trace_data["input_tokens"]
            output_tok = trace_data["output_tokens"]
            latency_ms = trace_data["latency_ms"]
            if trace_data["response_message"]:
                response_msg = trace_data["response_message"]
        else:
            steps = response_steps
            tools = []
            input_tok = 0
            output_tok = 0
            latency_ms = 0

        # Extract model info from score doc (kbn-evals stores task.model.id/family)
        task_model = ref_doc.get("task", {}).get("model", {}) or {}
        model_id = task_model.get("id", "unknown")
        model_family = task_model.get("family", "")
        if not model_family:
            # Derive family from model_id prefix
            id_lower = model_id.lower()
            if "anthropic" in id_lower or "claude" in id_lower:
                model_family = "Claude"
            elif "openai" in id_lower or "gpt" in id_lower or "o1" in id_lower or "o3" in id_lower:
                model_family = "OpenAI"
            elif "google" in id_lower or "gemini" in id_lower:
                model_family = "Google"
            else:
                model_family = model_id.split("-")[0].capitalize() if "-" in model_id else "Unknown"
        # Derive a clean display name from the model_id
        # e.g. "anthropic-claude-4.5-haiku" → "Claude 4.5 Haiku"
        if "anthropic" in model_id.lower():
            parts = model_id.replace("anthropic-", "").split("-")
            readable = " ".join(p.capitalize() if not p[0].isdigit() else p for p in parts if p)
            # Don't double-prefix: if readable starts with family name, drop the family prefix
            if readable.lower().startswith(model_family.lower()):
                model_name = readable
            else:
                model_name = f"{model_family} {readable}".strip()
        else:
            model_name = f"{model_family} {model_id}".strip()

        # Extract evaluator (judge) model
        evaluator_model = ref_doc.get("evaluator", {}).get("model", {}) or {}
        judge_model_id = evaluator_model.get("id", "unknown")
        judge_model_family = evaluator_model.get("family", judge_model_id.split("-")[0].capitalize() if "-" in judge_model_id else "Unknown")
        judge_model_name = f"{judge_model_family} {judge_model_id}" if judge_model_family != "Unknown" else judge_model_id

        category = resolve_category(ex_id)

        row = {
            "prompt_id": ex_id,
            "category": category,
            "target_skill": ref_doc.get("evaluator", {}).get("metadata", {}).get("expectedSkill", ""),
            "model_name": model_name,
            "model_id": model_id,
            "judge_model_name": judge_model_name,
            "judge_model_id": judge_model_id,
            "status": evaluator_label,
            "tools_called": ", ".join(tools) if tools else "—",
            "num_steps": len(steps) if isinstance(steps, list) else 0,
            "input_tokens": input_tok if input_tok else "?",
            "output_tokens": output_tok if output_tok else "?",
            "latency_ms": latency_ms,
            "response_message": response_msg,
            "steps": steps,
            "conversation_id": trace_id,
            "criteria_score": criteria_score,
            "trajectory_score": trajectory_score,
            "skill_invoked": skill_invoked,
        }
        rows.append(row)
        print(f" steps={len(steps)}, tools={len(tools)}, in_tok={input_tok}, out_tok={output_tok}, lat={latency_ms}ms")

    return rows, prompt_text

def render_persona_matrix(rows):
    """Generate llm_persona_matrix.html — matches Dhru's original layout exactly."""
    # Read Dhru's CSS and JS from local files (copied alongside this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        with open(os.path.join(script_dir, "dhru_persona.css")) as f:
            dhru_css = f.read()
    except FileNotFoundError:
        dhru_css = ""
    try:
        with open(os.path.join(script_dir, "dhru_persona.js")) as f:
            dhru_js = f.read()
    except FileNotFoundError:
        dhru_js = ""

    # Map our categories to Dhru's column IDs
    # alert-analysis → "alert"
    # entity-analytics → "entity"
    # threat-hunting → "hunt"
    # detection-rule-edit → "detrules"
    # workflow-authoring → "wfauth"
    # workflow-execution → "wftrig"
    # multi-step → "multistep"

    COL_MAP = {
        "alert-analysis": "alert",
        "entity-analytics": "entity",
        "threat-hunting": "hunt",
        "detection-rule-edit": "detrules",
        "workflow-authoring": "wfauth",
        "workflow-execution": "wftrig",
        "multi-step": "multistep",
    }

    # Aggregate per sub-category
    subcat_scores = {}  # col_id -> list of scores
    for r in rows:
        ex_id = r.get("prompt_id", "")
        prefix = "-".join(ex_id.split("-")[:-1])  # e.g. "alert-analysis" from "alert-analysis-a"
        col_id = COL_MAP.get(prefix, "")
        if not col_id:
            continue
        score = r.get("criteria_score")
        if score is not None:
            if col_id not in subcat_scores:
                subcat_scores[col_id] = []
            subcat_scores[col_id].append(score)

    def avg(lst):
        return sum(lst) / len(lst) if lst else None

    def score_class(score_10):
        if score_10 is None:
            return "na"
        if score_10 >= 8.0:
            return "high"
        elif score_10 >= 6.0:
            return "mid"
        else:
            return "low"

    # Multi-model support: group rows by model_name
    models_rows: dict[str, list] = {}
    for r in rows:
        m = r.get("model_name", "unknown")
        models_rows.setdefault(m, []).append(r)

    # Determine judge model from first row that has one
    judge_name = rows[0].get("judge_model_name", "unknown") if rows else "unknown"
    model_count = len(models_rows)
    prompt_count = len({r.get("prompt_id") for r in rows if r.get("prompt_id")})

    # Compute per-model stats
    def model_stats(m_rows: list):
        m_subcat = {}
        for r in m_rows:
            ex_id = r.get("prompt_id", "")
            prefix = "-".join(ex_id.split("-")[:-1])
            col_id = COL_MAP.get(prefix, "")
            if not col_id:
                continue
            score = r.get("criteria_score")
            if score is not None:
                m_subcat.setdefault(col_id, []).append(score)
        m_all_crit = [r["criteria_score"] for r in m_rows if r.get("criteria_score") is not None]
        m_overall = avg(m_all_crit) if m_all_crit else None
        m_ab = []
        for col_id in ["alert", "entity", "hunt", "detrules", "wfauth", "wftrig", "multistep"]:
            m_ab.extend(m_subcat.get(col_id, []))
        m_ab_avg = avg(m_ab) if m_ab else None
        m_tokens = []
        for r in m_rows:
            in_t = r.get("input_tokens", 0)
            out_t = r.get("output_tokens", 0)
            if isinstance(in_t, (int, float)) and isinstance(out_t, (int, float)):
                m_tokens.append(in_t + out_t)
        m_total = int(avg(m_tokens)) if m_tokens else 0
        if m_total < 200_000:
            m_tier, m_tcls = "Lean", "tier-lean"
        elif m_total < 400_000:
            m_tier, m_tcls = "Moderate", "tier-mod"
        else:
            m_tier, m_tcls = "Heavy", "tier-heavy"
        return {
            "subcat": m_subcat,
            "overall": m_overall,
            "ab_avg": m_ab_avg,
            "total_tokens": m_total,
            "tier": m_tier,
            "tcls": m_tcls,
        }

    model_stats_map = {m: model_stats(m_rows) for m, m_rows in models_rows.items()}
    model_order = sorted(models_rows.keys(), key=lambda m: (model_stats_map[m]["overall"] or 0), reverse=True)

    def fmt_cell_for_model(subcat: dict, col_id: str):
        scores = subcat.get(col_id, [])
        s = avg(scores)
        if s is None:
            return f'<td class="sc na" data-col="{col_id}">N/A</td>'
        s10 = s * 10
        cls = score_class(s10)
        ab_cls = "ab-col "
        sep = ""
        if col_id == "ab":
            sep = "sep-left "
        if col_id == "multistep":
            sep = "sep-right "
        return f'<td class="{ab_cls}{sep}sc {cls}" data-col="{col_id}">{s10:.1f}</td>'

    def vendor_badge(model_name: str):
        if "anthropic" in model_name.lower() or "claude" in model_name.lower():
            return '<span class="vendor v-anthropic">A</span>'
        if "openai" in model_name.lower() or "gpt" in model_name.lower():
            return '<span class="vendor v-openai">O</span>'
        if "google" in model_name.lower() or "gemini" in model_name.lower():
            return '<span class="vendor v-google">G</span>'
        return '<span class="vendor">?</span>'

    # Build model rows HTML
    tbody_rows = []
    for rank, m in enumerate(model_order, 1):
        s = model_stats_map[m]
        o10 = (s["overall"] * 10) if s["overall"] else 0
        ab10 = (s["ab_avg"] * 10) if s["ab_avg"] else 0
        ms_score = avg(s["subcat"].get("multistep", []))
        ms10 = (ms_score * 10) if ms_score else 0
        tbody_rows.append(
            f'<tr>\n'
            f'        <td class="rank">{rank}</td>\n'
            f'        <td class="left"><span class="model">{vendor_badge(m)}{m}</span></td>\n'
            f'        <td class="overall sc {score_class(o10)}" data-col="overall">{o10:.1f}</td>\n'
            f'        <td class="ab-col sep-left sc {score_class(ab10)}" data-col="ab">{ab10:.1f}</td>'
            f'{fmt_cell_for_model(s["subcat"], "alert")}{fmt_cell_for_model(s["subcat"], "entity")}'
            f'{fmt_cell_for_model(s["subcat"], "hunt")}{fmt_cell_for_model(s["subcat"], "detrules")}'
            f'{fmt_cell_for_model(s["subcat"], "wfauth")}{fmt_cell_for_model(s["subcat"], "wftrig")}'
            f'<td class="ab-col sep-right sc {score_class(ms10)}" data-col="multistep">{ms10:.1f}</td>\n'
            f'        <td class="sc na" data-col="ad">N/A</td>\n'
            f'        <td class="sc na" data-col="migration">N/A</td>\n'
            f'        <td class="tokcell" data-col="tokens"><span class="tier {s["tcls"]}">{s["tier"]} <span class="n">{s["total_tokens"] // 1000}K</span></span></td>\n'
            f'      </tr>'
        )

    # Overall = mean of all criteria scores
    all_criteria = [r["criteria_score"] for r in rows if r.get("criteria_score") is not None]
    overall = avg(all_criteria)
    overall_10 = (overall * 10) if overall else 0
    overall_cls = score_class(overall_10)

    # Agent Builder composite = mean of all AB sub-category scores
    ab_scores = []
    for col_id in ["alert", "entity", "hunt", "detrules", "wfauth", "wftrig", "multistep"]:
        ab_scores.extend(subcat_scores.get(col_id, []))
    ab_avg = avg(ab_scores)
    ab_10 = (ab_avg * 10) if ab_avg else 0
    ab_cls = score_class(ab_10)

    # Token tier
    all_tokens = []
    for r in rows:
        in_t = r.get("input_tokens", 0)
        out_t = r.get("output_tokens", 0)
        if isinstance(in_t, (int, float)) and isinstance(out_t, (int, float)):
            all_tokens.append(in_t + out_t)
    total_tokens = int(avg(all_tokens)) if all_tokens else 0
    if total_tokens < 200_000:
        tier, tcls = "Lean", "tier-lean"
    elif total_tokens < 400_000:
        tier, tcls = "Moderate", "tier-mod"
    else:
        tier, tcls = "Heavy", "tier-heavy"

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    tbody_html = "\n".join(tbody_rows)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LLM performance for Elastic Security &mdash; by your role</title>
{dhru_css}
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Elastic Security</p>
  <h1>LLM performance for Elastic Security &mdash; by your role</h1>
  <p class="lede">How well does each model handle the day-to-day tasks a security practitioner actually faces?
  We tested 21 prompts across 7 skill categories through the Elastic Security AI Assistant.
  Scores are judge-evaluated on a 0&ndash;10 scale.</p>
  <div class="meta">
    <span class="pill"><b>{model_count}</b> model{'s' if model_count != 1 else ''}</span>
    <span class="pill"><b>{prompt_count}</b> prompts</span>
    <span class="pill"><b>7</b> skill categories</span>
    <span class="pill"><b>judge:</b> {judge_name}</span>
    <span class="pill">generated {generated_at}</span>
  </div>

  <div class="tablewrap">
  <table class="matrix">
    <colgroup>
      <col class="c-rank" /><col class="c-model" />
      <col class="c-num" data-col="overall" />
      <col class="c-num" data-col="ab" /><col class="c-num" data-col="alert" /><col class="c-num" data-col="entity" /><col class="c-num" data-col="hunt" /><col class="c-num" data-col="detrules" /><col class="c-num" data-col="wfauth" /><col class="c-num" data-col="wftrig" /><col class="c-num" data-col="multistep" />
      <col class="c-num" data-col="ad" /><col class="c-num" data-col="migration" />
      <col style="width:110px;" data-col="tokens" />
    </colgroup>
    <thead>
      <tr class="groups">
        <th class="rank"></th>
        <th class="left"></th>
        <th></th>
        <th class="group ab sep-left sep-right" colspan="8">Agent Builder <span class="grouptag">overall + 7 sub-capabilities</span></th>
        <th class="group">Attack&nbsp;Discovery</th>
        <th class="group">Automatic&nbsp;Migration</th>
        <th class="group">Efficiency</th>
      </tr>
      <tr>
        <th class="rank">#</th>
        <th class="left">Model</th>
        <th data-col="overall">Overall</th>
        <th class="ab-col sep-left" data-col="ab">Agent&nbsp;Builder</th>
        <th class="ab-col" data-col="alert">Alert&nbsp;Analysis</th>
        <th class="ab-col" data-col="entity">Entity&nbsp;Analytics</th>
        <th class="ab-col" data-col="hunt">Threat&nbsp;Hunting</th>
        <th class="ab-col" data-col="detrules">Detection&nbsp;Rules</th>
        <th class="ab-col" data-col="wfauth">Workflow&nbsp;Authoring</th>
        <th class="ab-col" data-col="wftrig">Triggering&nbsp;Workflows</th>
        <th class="ab-col sep-right" data-col="multistep">Multi-Step&nbsp;Exec.</th>
        <th data-col="ad">Attack&nbsp;Discovery</th>
        <th data-col="migration">Automatic&nbsp;Migration</th>
        <th data-col="tokens">Tokens&nbsp;/&nbsp;task</th>
      </tr>
    </thead>
    <tbody>
{tbody_html}
    </tbody>
  </table>
  </div>

  <div class="toklegend">
    <span class="tier tier-lean">Lean <span class="n">&lt;200K</span></span>
    <span class="tier tier-mod">Moderate <span class="n">200&ndash;400K</span></span>
    <span class="tier tier-heavy">Heavy <span class="n">400K+</span></span>
  </div>
  <p style="margin-top:16px;font-size:12px;color:var(--muted)">
    Scores on 0&ndash;10 scale (criteria evaluator, judged by Claude 5 Sonnet).
    <span class="high" style="font-weight:600">High (8.0+)</span> &middot;
    <span class="mid" style="font-weight:600">Good (6.0&ndash;7.9)</span> &middot;
    <span class="low" style="font-weight:600">Low (&lt;6.0)</span>
    &nbsp;|&nbsp; Attack Discovery and Automatic Migration require separate eval suites (C6).
  </p>

  <div class="card">
    <h2 style="margin-top:0">Methodology</h2>
    <p>Each prompt was sent to the Elastic Security AI Assistant via <code>/api/agent_builder/converse</code>
    with the model under test as the connector. The judge model (Claude 5 Sonnet) evaluated
    each response on relevance, factuality, and sequence accuracy. Trace data (tokens, latency,
    tool calls) was captured from the golden cluster via OTLP.</p>
    <p><strong>Suite:</strong> <code>security-persona-matrix</code> (21 examples across 7 categories).
    <br><strong>Model:</strong> <code>anthropic-claude-4.5-haiku</code>
    <br><strong>Judge:</strong> <code>anthropic-claude-5-sonnet</code></p>
  </div>
</div>
{dhru_js}
</body>
</html>"""
    return html

def render_token_usage_matrix(rows):
    """Generate token_usage_overview_matrix.html — matches Dhru's dark-mode per-model layout."""
    from collections import defaultdict

    # Category metadata: name + description (from Dhru's original)
    CAT_META = [
        ("alert-analysis", "Alert Analysis",
         "Triage an alert, reach the correct disposition, pull related alerts, and enrich with threat intel."),
        ("entity-analytics", "Entity Analytics",
         "Investigate hosts and users using purpose-built entity lookups and risk context."),
        ("threat-hunting", "Threat Hunting",
         "Generate and run queries against process, file, and network telemetry to find specific hunt artifacts."),
        ("detection-rule-edit", "Detection Rules",
         "Author a working detection rule, grounded in research where requested."),
        ("workflow-authoring", "Workflow Authoring",
         "Produce a valid, executable automation workflow (verified by creating, enabling, and running it)."),
        ("workflow-execution", "Triggering Workflows",
         "Call the correct backed action for the task &mdash; e.g. hash lookup, on-call schedule, case creation."),
        ("multi-step", "Multi-Step Executions",
         "Chain several steps in the right order, carrying findings forward, without skipping or fabricating steps."),
    ]

    # Group by (model, category_prefix)
    # data[model_name][category_prefix] = {"in": [...], "out": [...], "total": [...]}
    data = defaultdict(lambda: defaultdict(lambda: {"in": [], "out": [], "total": []}))
    models_seen = set()
    for r in rows:
        model = r.get("model_name", "Unknown")
        models_seen.add(model)
        ex_id = r.get("prompt_id", "")
        prefix = "-".join(ex_id.split("-")[:-1])
        in_t = r.get("input_tokens", 0)
        out_t = r.get("output_tokens", 0)
        if isinstance(in_t, (int, float)) and isinstance(out_t, (int, float)):
            data[model][prefix]["in"].append(in_t)
            data[model][prefix]["out"].append(out_t)
            data[model][prefix]["total"].append(in_t + out_t)

    def avg(lst):
        return sum(lst) / len(lst) if lst else 0

    def fmt_range(lst):
        if not lst:
            return ""
        return f'{min(lst):,}&ndash;{max(lst):,}'

    # Build category cards (per-category table with models sorted heaviest-first)
    cat_cards = []
    for prefix, cat_name, cat_desc in CAT_META:
        model_rows = []
        for model in sorted(models_seen):
            d = data[model].get(prefix, {"in": [], "out": [], "total": []})
            if not d["total"]:
                continue
            avg_in = int(avg(d["in"]))
            avg_out = int(avg(d["out"]))
            avg_total = int(avg(d["total"]))
            model_rows.append((model, avg_in, avg_out, avg_total, d))
        # Sort heaviest-first by total
        model_rows.sort(key=lambda x: x[3], reverse=True)

        if not model_rows:
            continue

        tbody = []
        for model, avg_in, avg_out, avg_total, d in model_rows:
            tbody.append(
                f'<tr>'
                f'<td class="model">{model}</td>'
                f'<td class="num"><span class="avgval">{avg_in:,}</span>'
                f'<span class="rangeval">{fmt_range(d["in"])}</span></td>'
                f'<td class="num"><span class="avgval">{avg_out:,}</span>'
                f'<span class="rangeval">{fmt_range(d["out"])}</span></td>'
                f'<td class="num total-col"><span class="avgval">{avg_total:,}</span>'
                f'<span class="rangeval">{fmt_range(d["total"])}</span></td>'
                f'</tr>'
            )
        cat_cards.append(
            f'<div class="cat-card"><h3>{cat_name}</h3>'
            f'<table><thead><tr>'
            f'<th class="col-model">Model</th>'
            f'<th class="col-num">Input</th>'
            f'<th class="col-num">Output</th>'
            f'<th class="col-num total-col">Total</th>'
            f'</tr></thead><tbody>{"".join(tbody)}</tbody></table></div>'
        )

    # Category description list
    cat_desc_items = []
    for _, cat_name, cat_desc in CAT_META:
        cat_desc_items.append(f'<li><b>{cat_name}</b>{cat_desc}</li>')

    model_count = len(models_seen)
    prompt_count = len({r.get("prompt_id") for r in rows if r.get("prompt_id")})
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    cat_grid = "".join(cat_cards)
    cat_descs = "".join(cat_desc_items)

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Agent Builder &mdash; Tokens per Model per Category</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    margin:0; background:#0e1014; color:#e8ebf2; padding:40px 20px 80px; text-align:center; }}
  .wrap {{ max-width:1180px; margin:0 auto; }}
  h1 {{ font-size:24px; font-weight:700; margin:0 0 6px; letter-spacing:-.01em; }}
  h2 {{ font-size:17px; font-weight:600; margin:44px 0 12px; color:#e8ebf2; }}
  .lead {{ color:#aeb6c4; margin:0 auto 4px; font-size:14px; max-width:760px; }}
  p.sub {{ color:#9aa4b2; margin:0 auto 8px; font-size:13px; max-width:900px; }}

  .cat-grid {{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:22px; margin:20px auto 0; max-width:1180px; }}
  .cat-card {{ background:#14171e; border:1px solid #232a36; border-radius:12px; overflow:hidden; }}
  .cat-card h3 {{ margin:0; padding:13px 16px; font-size:14px; font-weight:600; text-align:left;
    background:#1c212c; color:#e8ebf2; border-bottom:1px solid #2a3140; }}
  table {{ border-collapse:separate; border-spacing:0; width:100%; font-size:13px; margin:0; }}
  th,td {{ padding:9px 12px; vertical-align:middle; }}
  thead th {{ color:#8b94a3; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;
    border-bottom:1px solid #2a3140; }}
  thead th.col-model {{ text-align:left; }}
  thead th.col-num {{ text-align:right; }}
  tbody td {{ border-top:1px solid #1d232e; }}
  tbody tr:nth-child(even) {{ background:#171b22; }}
  tbody tr:hover {{ background:#1f2530; }}
  td.model {{ font-weight:600; text-align:left; white-space:nowrap; }}
  td.num {{ font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }}
  td.num.total-col {{ background:rgba(124,176,255,.06); }}
  thead th.total-col {{ color:#9bb6e0; }}
  .avgval {{ color:#e8ebf2; }}
  .rangeval {{ color:#8b94a3; font-size:11px; display:block; }}

  .cats {{ list-style:none; padding:0; margin:16px auto 0; max-width:920px; text-align:left;
    display:grid; grid-template-columns:1fr 1fr; gap:10px 28px; }}
  .cats li {{ font-size:13px; line-height:1.5; color:#c7cedb; padding:12px 14px;
    background:#14171e; border:1px solid #232a36; border-radius:10px; }}
  .cats b {{ color:#e8ebf2; display:block; margin-bottom:2px; font-size:13.5px; }}
  .keyrow {{ display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin:14px auto 0;
    color:#9aa4b2; font-size:12px; }}
  .keyrow .avgval, .keyrow .rangeval {{ font-size:12px; display:inline; }}
  @media (max-width:820px) {{ .cat-grid {{ grid-template-columns:1fr; }} }}
</style></head><body>
<div class="wrap">
<h1>Agent Builder &mdash; Tokens per Model per Category</h1>
<p class="lead">Approximate token usage for completing a real task in each Security capability,
measured across {model_count} model{'s' if model_count != 1 else ''} in our Agent Builder evaluations.</p>
<ul class="cats">
{cat_descs}
</ul>

<h2>Tokens per model per category</h2>
<div class="keyrow">
  <span><span class="avgval">456,789</span> = average tokens for the task</span>
  <span><span class="rangeval">123,456&ndash;789,012</span> = range across the category&rsquo;s prompts</span>
  <span>Each category is its own table &middot; Input / Output / Total &middot; models sorted heaviest first</span>
</div>
<div class="cat-grid">{cat_grid}</div>
<p class="sub" style="margin-top:36px">Generated {generated_at} &middot; {prompt_count} prompts &middot; {model_count} model{'s' if model_count != 1 else ''}</p>
</div>
</body></html>"""
    return html

def render_index(rows):
    """Generate index.html — landing page linking all reports."""
    from collections import Counter

    cat_counts = Counter(r.get("category", "?") for r in rows)
    total_tokens = sum(r.get("input_tokens", 0) + r.get("output_tokens", 0) for r in rows if isinstance(r.get("input_tokens"), (int, float)))
    avg_tokens = int(total_tokens / len(rows)) if rows else 0
    scores = [r["criteria_score"] for r in rows if r.get("criteria_score") is not None]
    overall = (sum(scores) / len(scores) * 10) if scores else 0

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    models = sorted(set(r.get("model_name", "?") for r in rows))

    cards = []
    for title, desc, filename, icon in [
        ("LLM Persona Matrix", "Scores by security role and capability area", "llm_persona_matrix.html", "🎯"),
        ("Agent Eval Detail", "Per-prompt responses, tool traces, step-by-step reasoning", "agent_eval_full.html", "🤖"),
        ("Token Usage Overview", "Input/output tokens and latency by category", "token_usage_overview_matrix.html", "📊"),
        ("Attack Discovery", "Per-scenario insights, MITRE tactics, risk scores", "attack_discovery_results.html", "🔍"),
    ]:
        cards.append(f"""
    <a class="card" href="{filename}">
      <div class="card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </a>""")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Security LLM Eval Reports</title>
<style>
  :root {{
    --ink: #1c1e23; --muted: #6a717d; --line: #e3e6eb; --bg: #f7f8fa;
    --card: #ffffff; --accent: #0b64dd; --good: #16876a;
    --radius: 12px; --shadow: 0 1px 2px rgba(20,30,50,.06), 0 4px 16px rgba(20,30,50,.05);
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    color: var(--ink); background: var(--bg); line-height: 1.55; }}
  .wrap {{ max-width: 760px; margin: 0 auto; padding: 48px 28px 96px; }}
  h1 {{ font-size: 28px; margin: 0 0 6px; letter-spacing: -.01em; }}
  .sub {{ color: var(--muted); font-size: 15px; margin: 0 0 32px; }}
  .stats {{ display: flex; gap: 12px; margin-bottom: 36px; flex-wrap: wrap; }}
  .stat {{ background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 16px 20px; box-shadow: var(--shadow); text-align: center; min-width: 100px; }}
  .stat .n {{ font-size: 24px; font-weight: 700; color: var(--ink); }}
  .stat .l {{ font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-top: 4px; }}
  .cards {{ display: grid; grid-template-columns: 1fr; gap: 16px; }}
  a.card {{ display: flex; align-items: center; gap: 16px; background: var(--card); border: 1px solid var(--line);
    border-radius: var(--radius); padding: 20px 24px; text-decoration: none; color: var(--ink);
    box-shadow: var(--shadow); transition: border-color .15s, transform .1s; }}
  a.card:hover {{ border-color: var(--accent); transform: translateY(-1px); }}
  .card-icon {{ font-size: 28px; flex-shrink: 0; }}
  a.card h3 {{ margin: 0 0 4px; font-size: 16px; }}
  a.card p {{ margin: 0; font-size: 13px; color: var(--muted); }}
  .footer {{ margin-top: 48px; font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 20px; }}
  .score-pill {{ display: inline-block; background: #e3f5ee; color: var(--good); font-weight: 700;
    padding: 2px 10px; border-radius: 999px; font-size: 14px; }}
</style>
</head>
<body>
<div class="wrap">
  <h1>Security LLM Eval Reports</h1>
  <p class="sub">Generated {generated_at} · <code>security-persona-matrix</code> suite</p>

  <div class="stats">
    <div class="stat"><div class="n">{len(models)}</div><div class="l">Models</div></div>
    <div class="stat"><div class="n">{len(rows)}</div><div class="l">Prompts</div></div>
    <div class="stat"><div class="n">{len(cat_counts)}</div><div class="l">Categories</div></div>
    <div class="stat"><div class="n"><span class="score-pill">{overall:.1f}</span></div><div class="l">Overall (0–10)</div></div>
    <div class="stat"><div class="n">{avg_tokens // 1000}K</div><div class="l">Avg Tokens</div></div>
  </div>

  <div class="cards">
    {''.join(cards)}
  </div>

  <div class="footer">
    <p><strong>Model(s):</strong> {', '.join(models)}</p>
    <p><strong>Judge:</strong> Claude 5 Sonnet via criteria evaluator</p>
    <p><strong>Trace source:</strong> Golden cluster (kbn-evals-serverless) via OTLP</p>
    <p>Data fetched from local ES (:9220) + enriched from golden cluster traces.</p>
  </div>
</div>
</body>
</html>"""
    return html

def main():
    # 1. Fetch scores (or load from cached JSONL if ES is down)
    jsonl_path = os.path.join(OUTPUT_DIR, "agent_eval.jsonl")
    score_docs = fetch_scores()

    if not score_docs:
        # ES is down — try loading from cached JSONL
        print("  ES unavailable, checking for cached JSONL...")
        if os.path.exists(jsonl_path):
            with open(jsonl_path) as f:
                rows = [json.loads(l) for l in f]
            print(f"  Loaded {len(rows)} rows from cached JSONL")
        else:
            print("FATAL: Could not fetch scores and no cached JSONL found")
            sys.exit(1)
    else:
        # 2. Build JSONL rows with golden cluster enrichment
        rows, _ = build_jsonl_rows(score_docs)
        print(f"\nBuilt {len(rows)} JSONL rows")

        # 3. Write JSONL
        with open(jsonl_path, "w") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"Wrote {jsonl_path}")

        # 4. Write prompts CSV
        prompts_path = os.path.join(OUTPUT_DIR, "agent_prompts.csv")
        with open(prompts_path, "w") as f:
            f.write("id,prompt\n")
            for r in rows:
                f.write(f'{r["prompt_id"]},\n')
        print(f"Wrote {prompts_path}")

    # 5. Run Dhru's render_agent_eval_html.py
    print("\nRendering agent_eval_full.html via Dhru's script...")
    html_out = os.path.join(OUTPUT_DIR, "agent_eval_full.html")
    result = subprocess.run(
        ["python3", os.path.join(DHRU_DIR, "render_agent_eval_html.py"),
         "--in", jsonl_path, "--out", html_out],
        capture_output=True, text=True, cwd=DHRU_DIR
    )
    if result.returncode == 0:
        print(f"  {result.stdout.strip()}")
    else:
        print(f"  ERROR: {result.stderr[:500]}", file=sys.stderr)

    # 5b. Post-process: collapse details by default, fix step trace spacing,
    #     add horizontal scroll wrapper for wide tables
    if os.path.exists(html_out):
        with open(html_out, "r") as f:
            agent_html = f.read()

        original_len = len(agent_html)

        # Collapse all <details> by default (Dhru hardcodes open=""):
        # Keep first <details class="prompt"> open for preview
        agent_html = agent_html.replace(' open>', '>')
        # Re-open just the first prompt for preview
        idx = agent_html.find('<details class="prompt">')
        if idx >= 0:
            agent_html = agent_html[:idx] + '<details class="prompt" open>' + agent_html[idx + len('<details class="prompt">'):]

        # Add gap between step-tag and content (THINK runs into text)
        agent_html = agent_html.replace(
            ".step-tag { flex:none; font-size:10px;",
            ".step-tag { flex:none; font-size:10px; margin-right:4px; min-width:32px;"
        )

        # Wrap summary table in horizontal scroll container
        table_scroll_css = "<style>.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}</style>"
        agent_html = agent_html.replace("</head>", table_scroll_css + "</head>")
        # Wrap the first <table> (summary grid) in scroll div
        agent_html = agent_html.replace("<table>", '<div class="table-scroll"><table>', 1)
        # Close the div after the first </table>
        first_close = agent_html.find("</table>")
        if first_close > 0:
            agent_html = agent_html[:first_close + 8] + "</div>" + agent_html[first_close + 8:]

        with open(html_out, "w") as f:
            f.write(agent_html)
        print(f"  Post-processed: {original_len:,} -> {len(agent_html):,} bytes (details collapsed, table scroll, step spacing)")

    # 6. Generate persona matrix
    print("\nGenerating llm_persona_matrix.html...")
    matrix_html = render_persona_matrix(rows)
    matrix_path = os.path.join(OUTPUT_DIR, "llm_persona_matrix.html")
    with open(matrix_path, "w") as f:
        f.write(matrix_html)
    print(f"  Wrote {matrix_path} ({len(matrix_html):,} bytes)")

    # 7. Generate token usage matrix
    print("\nGenerating token_usage_overview_matrix.html...")
    token_html = render_token_usage_matrix(rows)
    token_path = os.path.join(OUTPUT_DIR, "token_usage_overview_matrix.html")
    with open(token_path, "w") as f:
        f.write(token_html)
    print(f"  Wrote {token_path} ({len(token_html):,} bytes)")

    # 8. Generate index.html
    print("\nGenerating index.html...")
    index_html = render_index(rows)
    index_path = os.path.join(OUTPUT_DIR, "index.html")
    with open(index_path, "w") as f:
        f.write(index_html)
    print(f"  Wrote {index_path} ({len(index_html):,} bytes)")

    print("\n✅ All reports generated from real eval data.")

if __name__ == "__main__":
    main()
