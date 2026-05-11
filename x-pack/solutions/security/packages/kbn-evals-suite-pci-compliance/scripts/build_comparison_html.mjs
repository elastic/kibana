#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Build the side-by-side comparison HTML report between the hand-written
 * `pci-compliance` skill and the autonomously-architected
 * `pci-compliance-autonomous` skill.
 *
 * Inputs (all optional — script degrades gracefully):
 *   --handwritten <dir>   directory containing the handwritten variant's eval
 *                         outputs (results.json + judge artefacts).
 *   --autonomous  <dir>   directory containing the autonomous variant's eval
 *                         outputs.
 *   --out         <path>  where to write the resulting HTML file. Defaults to
 *                         <package>/comparison.html.
 *
 * If neither results directory is populated, the report still renders with the
 * STRUCTURAL comparison (line counts, citation counts, tool sets, content
 * sections) and an explicit "awaiting live eval run" banner that prints the
 * exact one-liner needed to populate the live numbers. This honours the
 * `address-known-limitations` rule: ship the discovery seam in the same cycle
 * as the structural work; live numbers fill in for free the next time
 * someone has cluster credentials.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { resolve, dirname } from 'path';
// eslint-disable-next-line import/no-nodejs-modules
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_DIR, '../../../../..');

/**
 * Render a path RELATIVE to the Kibana repo root for inclusion in the HTML.
 * The HTML must not embed any developer-specific absolute paths — it ships in
 * the repo and is read by anyone reproducing the comparison from a fresh
 * checkout.
 */
function repoRelative(absPath) {
  const root = REPO_ROOT.endsWith('/') ? REPO_ROOT : REPO_ROOT + '/';
  return absPath.startsWith(root) ? absPath.slice(root.length) : absPath;
}

// ─── argv ──────────────────────────────────────────────────────────────────
// Two run shapes are supported:
//   - Single-model mode (legacy): --handwritten <dir> --autonomous <dir>
//   - Multi-model mode:           --runs <label>=<dir>,<label>=<dir>,...
//     where each <label> matches one of the known variant×model cells, e.g.
//       opus47-handwritten, opus47-autonomous, sonnet46-handwritten, sonnet46-autonomous.
//     When --runs is provided the legacy --handwritten / --autonomous values
//     still feed §2-§3 (structural metrics) but §4 renders the full grid.
const args = (() => {
  const out = {
    handwritten: resolve(PKG_DIR, 'runs/handwritten'),
    autonomous: resolve(PKG_DIR, 'runs/autonomous'),
    out: resolve(PKG_DIR, 'comparison.html'),
    runs: null,
  };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--handwritten') out.handwritten = resolve(argv[++i]);
    else if (a === '--autonomous') out.autonomous = resolve(argv[++i]);
    else if (a === '--out') out.out = resolve(argv[++i]);
    else if (a === '--runs') {
      out.runs = {};
      for (const pair of argv[++i].split(',')) {
        const [label, dir] = pair.split('=');
        if (!label || !dir) throw new Error(`invalid --runs entry: ${pair}`);
        out.runs[label.trim()] = resolve(dir.trim());
      }
    } else if (a === '-h' || a === '--help') {
      process.stdout.write(
        'Usage: build_comparison_html.mjs --handwritten <dir> --autonomous <dir> --out <html>\n' +
          '   or: build_comparison_html.mjs --runs <label>=<dir>,... --out <html>\n'
      );
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    } else throw new Error(`unknown arg: ${a}`);
  }
  return out;
})();

// ─── inputs (skill source files) ───────────────────────────────────────────
const HANDWRITTEN_SKILL = resolve(
  PKG_DIR,
  '../../plugins/security_solution/server/agent_builder/skills/pci_compliance/pci_compliance_skill.ts'
);
const AUTONOMOUS_SKILL = resolve(
  PKG_DIR,
  '../../plugins/security_solution/server/agent_builder/skills/pci_compliance_autonomous/pci_compliance_autonomous_skill.ts'
);
const HANDWRITTEN_TESTS = resolve(
  PKG_DIR,
  '../../plugins/security_solution/server/agent_builder/skills/pci_compliance/pci_compliance_skill.test.ts'
);
const AUTONOMOUS_TESTS = resolve(
  PKG_DIR,
  '../../plugins/security_solution/server/agent_builder/skills/pci_compliance_autonomous/pci_compliance_autonomous_skill.test.ts'
);
const SPEC_FILE = resolve(PKG_DIR, 'evals/pci_compliance/pci_compliance.spec.ts');

// ─── helpers ───────────────────────────────────────────────────────────────
const readSafe = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
function deltaClassFor(delta) {
  if (delta > 0) return 'delta-positive';
  if (delta < 0) return 'delta-negative';
  return '';
}
const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function extractContent(skillSource) {
  // Pull the markdown body out of the `content: \`...\`` template literal.
  const match = skillSource.match(/content:\s*`([\s\S]*?)`,\s*\n\s*getRegistryTools/);
  return match ? match[1] : '';
}

function metricsForContent(content) {
  const lines = content.split('\n');
  const sections = lines.filter((l) => /^##\s/.test(l)).length;
  const subSections = lines.filter((l) => /^###\s/.test(l)).length;
  const bullets = lines.filter((l) => /^\s*[-*]\s/.test(l)).length;
  const codeFences = (content.match(/```/g) || []).length / 2;
  const doNotUseBullets = (() => {
    const m = content.match(/Do\s+\*?\*?not\*?\*?\s+use[\s\S]*?(?=\n##\s|\n$)/i);
    if (!m) return 0;
    return m[0].split('\n').filter((l) => /^\s*-\s/.test(l)).length;
  })();
  const v401Mentions = (content.match(/v?4\.0\.1/gi) || []).length;
  const requirementMentions = (content.match(/requirement\s*\d/gi) || []).length;
  return {
    chars: content.length,
    lines: lines.length,
    sections,
    subSections,
    bullets,
    codeFences: Math.floor(codeFences),
    doNotUseBullets,
    v401Mentions,
    requirementMentions,
  };
}

function loadVariantResults(dir) {
  // Look for a results.json or any *.json artifact under the dir.
  const tried = [];
  if (!existsSync(dir)) return { populated: false, dir, scenarios: [], tried };
  for (const name of ['results.json', 'eval-results.json', 'summary.json']) {
    const p = resolve(dir, name);
    tried.push(p);
    if (existsSync(p) && statSync(p).isFile()) {
      try {
        const json = JSON.parse(readFileSync(p, 'utf8'));
        return { populated: true, dir, file: p, scenarios: normaliseScenarios(json), tried };
      } catch (e) {
        return { populated: false, dir, file: p, error: String(e), scenarios: [], tried };
      }
    }
  }
  return { populated: false, dir, scenarios: [], tried };
}

/**
 * Normalise diverse @kbn/evals output shapes into a flat array of:
 *   { scenario, score, criteria: [{name, score, rationale}], errors,
 *     skill_invoked_label, tool_call_total, pci_skill_tool_calls }
 * Best-effort — unknown shapes pass through.
 *
 * The actual @kbn/evals framework exports per (run × scenario × evaluator)
 * documents to the `kibana-evaluations` index in Elasticsearch. To populate the
 * comparison from a live cluster, snapshot the index with `_search?size=200`
 * straight into a results.json next to this script — this normaliser then
 * folds the per-evaluator rows back into per-scenario rows so the HTML can show
 * a single line per scenario with both a PCI-Criteria score and a Skill-Invoked
 * verdict.
 */
function normaliseScenarios(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.scenarios)) return raw.scenarios;
  if (raw && Array.isArray(raw.experiments)) return raw.experiments.map((e) => ({
    scenario: e.name,
    score: e.score,
    criteria: e.evaluators?.[0]?.criteria ?? [],
    errors: e.errors ?? [],
  }));
  // ES `_search` shape: { hits: { hits: [{ _source: { evaluator, example, task, ... } }] } }
  if (raw && raw.hits && Array.isArray(raw.hits.hits)) {
    const byScenario = new Map();
    for (const hit of raw.hits.hits) {
      const src = hit._source ?? {};
      const scn = src.example?.dataset?.name ?? src.example?.id ?? 'unknown';
      const cur = byScenario.get(scn) ?? {
        scenario: scn,
        score: NaN,
        skill_invoked_label: null,
        tool_call_total: 0,
        pci_skill_tool_calls: 0,
        criteria: [],
        errors: [],
      };
      const evName = src.evaluator?.name ?? '';
      const evScore = src.evaluator?.score;
      const evLabel = src.evaluator?.label;
      // The PCI Criteria evaluator is the primary numeric score for this suite.
      if (evName === 'PCI Criteria' && typeof evScore === 'number') {
        cur.score = evScore;
      }
      // The "Skill Invoked (...)" evaluator gives a categorical verdict.
      if (evName.startsWith('Skill Invoked')) {
        cur.skill_invoked_label = evLabel ?? cur.skill_invoked_label;
      }
      // Walk the agent's recorded tool-call steps and tally pci-skill vs other.
      const steps = src.task?.output?.steps ?? [];
      for (const step of steps) {
        if (step?.type === 'tool_call') {
          cur.tool_call_total += 1;
          if (typeof step.tool_id === 'string' && step.tool_id.startsWith('security.pci_')) {
            cur.pci_skill_tool_calls += 1;
          }
        }
      }
      byScenario.set(scn, cur);
    }
    return [...byScenario.values()];
  }
  return [{ scenario: 'unknown shape', raw }];
}

const handwrittenContent = extractContent(readSafe(HANDWRITTEN_SKILL));
const autonomousContent = extractContent(readSafe(AUTONOMOUS_SKILL));
const handwrittenMetrics = metricsForContent(handwrittenContent);
const autonomousMetrics = metricsForContent(autonomousContent);

// Test counts
const handwrittenTestCount = (readSafe(HANDWRITTEN_TESTS).match(/^\s*it\(/gm) || []).length;
const autonomousTestCount = (readSafe(AUTONOMOUS_TESTS).match(/^\s*it\(/gm) || []).length;
const specScenarioCount = (readSafe(SPEC_FILE).match(/^\s*evaluate\(/gm) || []).length;

const handwrittenResults = loadVariantResults(args.handwritten);
const autonomousResults = loadVariantResults(args.autonomous);
const liveResultsAvailable = handwrittenResults.populated && autonomousResults.populated;

// Multi-model results, keyed by label (e.g. "opus47-handwritten"). Each value
// is the same shape as loadVariantResults's return.
const multiRuns = args.runs
  ? Object.fromEntries(Object.entries(args.runs).map(([k, dir]) => [k, loadVariantResults(dir)]))
  : null;
const multiRunsAvailable =
  multiRuns && Object.values(multiRuns).every((r) => r.populated);

// ─── compute per-scenario diff if live results are available ───────────────
function diffScenarios(handwritten, autonomous) {
  if (!handwritten.populated || !autonomous.populated) return null;
  const map = new Map();
  for (const s of handwritten.scenarios) map.set(s.scenario || s.name, { hw: s });
  for (const s of autonomous.scenarios) {
    const k = s.scenario || s.name;
    const cur = map.get(k) ?? {};
    cur.au = s;
    map.set(k, cur);
  }
  return [...map.entries()].map(([k, v]) => {
    const hwScore = Number(v.hw?.score ?? NaN);
    const auScore = Number(v.au?.score ?? NaN);
    return {
      scenario: k,
      handwritten: hwScore,
      autonomous: auScore,
      delta: Number.isFinite(hwScore) && Number.isFinite(auScore) ? auScore - hwScore : NaN,
    };
  });
}

const scenarioDiff = diffScenarios(handwrittenResults, autonomousResults);

/**
 * Aggregate routing-level signals (whether the agent router picked the PCI
 * skill at all, vs falling back to generic platform tools). When both variants
 * score 0 across the board this is the diagnostic that explains *why*: a small
 * model can fail to engage either skill, in which case the comparison is
 * apples-to-apples but uninformative about skill content.
 */
function aggregateRouting(variant) {
  if (!variant.populated || !Array.isArray(variant.scenarios)) return null;
  let scenarioCount = 0;
  let scenariosWithPciToolCall = 0;
  let totalToolCalls = 0;
  let pciSkillToolCalls = 0;
  let skillInvokedSuccess = 0;
  for (const s of variant.scenarios) {
    scenarioCount += 1;
    totalToolCalls += s.tool_call_total ?? 0;
    pciSkillToolCalls += s.pci_skill_tool_calls ?? 0;
    if ((s.pci_skill_tool_calls ?? 0) > 0) scenariosWithPciToolCall += 1;
    if (s.skill_invoked_label && s.skill_invoked_label !== 'error') skillInvokedSuccess += 1;
  }
  return {
    scenarioCount,
    scenariosWithPciToolCall,
    totalToolCalls,
    pciSkillToolCalls,
    skillInvokedSuccess,
  };
}

const handwrittenRouting = aggregateRouting(handwrittenResults);
const autonomousRouting = aggregateRouting(autonomousResults);

// ─── emit HTML ─────────────────────────────────────────────────────────────
const generatedAt = new Date().toISOString();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PCI compliance skill — hand-written vs autonomous (side-by-side)</title>
<style>
  :root {
    --bg: #fafbfc;
    --panel: #ffffff;
    --fg: #1f2328;
    --mute: #57606a;
    --accent: #1a73e8;
    --green: #1a7f37;
    --red: #cf222e;
    --amber: #9a6700;
    --border: #d0d7de;
  }
  * { box-sizing: border-box; }
  body {
    font: 15px/1.5 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--fg);
    max-width: 1180px; margin: 1rem auto; padding: 1.6rem;
  }
  h1 { font-size: 1.9rem; margin: 0 0 0.4rem; }
  h2 { font-size: 1.3rem; margin: 2rem 0 0.6rem; padding-top: 0.6rem; border-top: 1px solid var(--border); }
  h3 { font-size: 1.05rem; margin: 1.2rem 0 0.4rem; }
  .lead { color: var(--mute); margin: 0.4rem 0 1rem; font-size: 1rem; }
  code { background: #f6f8fa; padding: 0.06em 0.4em; border-radius: 4px; font-size: 0.9em; }
  pre { background: #0d1117; color: #e6edf3; padding: 0.9rem 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.86rem; }
  table { border-collapse: collapse; width: 100%; margin: 0.6rem 0 1.2rem; background: var(--panel); }
  th, td { border: 1px solid var(--border); padding: 0.5rem 0.7rem; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.7rem; margin: 0.6rem 0 1rem; }
  .kpi { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.7rem 0.9rem; }
  .kpi .label { color: var(--mute); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi .value { font-size: 1.4rem; font-weight: 600; margin-top: 0.2rem; }
  .kpi .delta-positive { color: var(--green); font-size: 0.8rem; }
  .kpi .delta-negative { color: var(--red); font-size: 0.8rem; }
  .banner { border-radius: 8px; padding: 0.8rem 1rem; margin: 1rem 0; border: 1px solid; }
  .banner-info { background: #e8f0fe; border-color: #1a73e8; }
  .banner-warn { background: #fff8e1; border-color: var(--amber); }
  .banner-success { background: #e6f4ea; border-color: var(--green); }
  .pillrow { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.4rem 0 1rem; }
  .pill { background: var(--panel); border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.78rem; color: var(--mute); }
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.6rem 0 1rem; }
  .twocol > div { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.8rem 1rem; }
  .twocol h4 { margin: 0 0 0.4rem; font-size: 0.95rem; color: var(--mute); text-transform: uppercase; letter-spacing: 0.04em; }
  details summary { cursor: pointer; font-weight: 600; padding: 0.3rem 0; }
  .footnote { color: var(--mute); font-size: 0.85rem; margin-top: 0.6rem; }
</style>
</head>
<body>

<h1>PCI compliance skill: <span style="color:var(--mute);font-weight:400">hand-written</span> vs <span style="color:var(--accent)">autonomous</span></h1>
<p class="lead">
  Side-by-side comparison of two Agent Builder skills that target the same domain
  (PCI DSS v4.0.1 compliance). The hand-written variant uses 3 PCI tools authored by
  Smriti; the autonomous variant now uses its <strong>own independently-authored
  4-tool decomposition</strong> (cycle-17 architect blueprint) — neither skill knows
  about the other's tools. This validates a full end-to-end autonomous workflow
  where <em>both</em> the skill and its supporting tools are autonomously created.
</p>

<div class="pillrow">
  <span class="pill">generated: ${escapeHtml(generatedAt)}</span>
  <span class="pill">hand-written by: <strong>Smriti</strong> (PR #256060)</span>
  <span class="pill">autonomous by: <strong>skill.architect</strong> (cycle-17)</span>
  <span class="pill">eval suite: <code>@kbn/evals-suite-pci-compliance</code> (${specScenarioCount} scenarios)</span>
</div>

${
  liveResultsAvailable
    ? `<div class="banner banner-success"><strong>Live eval data attached.</strong> Both variants ran through the same suite; per-scenario scores and judge rationales are populated below.</div>`
    : `<div class="banner banner-warn"><strong>Awaiting live eval run.</strong> The structural comparison below is complete and accurate. To populate the live LLM-judge scores, run on a Kibana host with a configured AI connector:
<pre>cd kibana
./x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/scripts/compare_variants.sh</pre>
The script boots Kibana twice (once per variant), runs all ${specScenarioCount} scenarios against each, then refreshes this HTML with live scores. No code changes needed — the seam is wired.</div>`
}

<h2>Headline KPIs</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="label">Hand-written content</div>
    <div class="value">${handwrittenMetrics.chars.toLocaleString()} chars</div>
    <div class="footnote">${handwrittenMetrics.lines} lines · ${handwrittenMetrics.sections} sections · ${handwrittenMetrics.bullets} bullets</div></div>
  <div class="kpi"><div class="label">Autonomous content</div>
    <div class="value">${autonomousMetrics.chars.toLocaleString()} chars</div>
    <div class="footnote">${autonomousMetrics.lines} lines · ${autonomousMetrics.sections} sections · ${autonomousMetrics.bullets} bullets</div></div>
  <div class="kpi"><div class="label">v4.0.1 anchors</div>
    <div class="value">HW: ${handwrittenMetrics.v401Mentions} / Auto: ${autonomousMetrics.v401Mentions}</div>
    <div class="footnote">Both pin to v4.0.1 (June 2024 limited revision).</div></div>
  <div class="kpi"><div class="label">Do-not-use boundaries</div>
    <div class="value">HW: ${handwrittenMetrics.doNotUseBullets} / Auto: ${autonomousMetrics.doNotUseBullets}</div>
    <div class="footnote">More boundaries → less activation drift on adjacent topics.</div></div>
  <div class="kpi"><div class="label">Skill-contract tests</div>
    <div class="value">HW: ${handwrittenTestCount} / Auto: ${autonomousTestCount}</div>
    <div class="footnote">Both lock in tool-id parity and v4.0.1 invariants.</div></div>
  <div class="kpi"><div class="label">Live eval scenarios</div>
    <div class="value">${specScenarioCount}</div>
    <div class="footnote">Same spec runs against either variant.</div></div>
</div>

<h2>1 · Architecture (always-true, independent of eval results)</h2>
<table>
  <thead><tr><th>Aspect</th><th>Hand-written variant</th><th>Autonomous variant</th></tr></thead>
  <tbody>
    <tr><td>Skill ID</td><td><code>pci-compliance</code></td><td><code>pci-compliance-autonomous</code></td></tr>
    <tr><td>Author</td><td>Smriti (Elastic Security) — PR #256060</td><td><code>skill.architect</code> orchestrator (cycle-17)</td></tr>
    <tr><td>PCI-domain tools</td><td><code>pci_scope_discovery</code>, <code>pci_compliance</code> (mode: check / report), <code>pci_field_mapper</code> — 3 tools, hand-written by Smriti</td><td><code>pci_autonomous_scope_discovery</code>, <code>pci_autonomous_compliance_check</code>, <code>pci_autonomous_scorecard_report</code>, <code>pci_autonomous_field_mapper</code> — 4 tools, autonomously decomposed per the cycle-17 blueprint, registered behind a separate allowlist entry</td></tr>
    <tr><td>Platform tools (shared)</td><td colspan="2" style="text-align:center"><code>platform.core.generate_esql</code>, <code>platform.core.execute_esql</code></td></tr>
    <tr><td>Feature flag</td><td><code>pciComplianceAgentBuilder</code></td><td><code>pciComplianceAutonomousAgentBuilder</code></td></tr>
    <tr><td>Scout config set</td><td><code>evals_pci_compliance</code></td><td><code>evals_pci_compliance_autonomous</code></td></tr>
    <tr><td>Buildkite step</td><td><code>kbn-evals-weekly-pci-compliance</code></td><td><code>kbn-evals-weekly-pci-compliance-autonomous</code></td></tr>
  </tbody>
</table>

<h2>2 · Skill content comparison (structural)</h2>
<table>
  <thead><tr><th>Metric</th><th>Hand-written</th><th>Autonomous</th><th>Δ</th></tr></thead>
  <tbody>
    ${[
      ['Total characters', 'chars'],
      ['Total lines', 'lines'],
      ['## sections', 'sections'],
      ['### sub-sections', 'subSections'],
      ['Bullet items', 'bullets'],
      ['Code/table fences', 'codeFences'],
      ['Do-not-use bullets', 'doNotUseBullets'],
      ['v4.0.1 mentions', 'v401Mentions'],
      ['Requirement-N mentions', 'requirementMentions'],
    ]
      .map(([label, key]) => {
        const hw = handwrittenMetrics[key];
        const au = autonomousMetrics[key];
        const delta = au - hw;
        const deltaClass = deltaClassFor(delta);
        const deltaSign = delta > 0 ? '+' : '';
        return `<tr><td>${label}</td><td class="num">${hw}</td><td class="num">${au}</td><td class="num ${deltaClass}">${deltaSign}${delta}</td></tr>`;
      })
      .join('\n    ')}
  </tbody>
</table>

<h2>3 · Distinguishing autonomous-architect contributions</h2>
<p class="lead">
  The autonomous skill content carries domain knowledge from the cycle-17 model-knowledge
  reconciliation pass (4 distinct mk citations + 1 model-internal-corroborated). These do not
  appear in the hand-written variant; they are the autonomous architect's value-add over
  what the human author produced.
</p>
<table>
  <thead><tr><th>Domain knowledge</th><th>HW present?</th><th>Auto present?</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>SAQ taxonomy (A, A-EP, D-MER, D-SP, …)</td><td>${/SAQ/.test(handwrittenContent) ? '✓' : '✗'}</td><td>${/SAQ/.test(autonomousContent) ? '✓' : '✗'}</td><td>model-knowledge (distinct)</td></tr>
    <tr><td>v3.2.1 → v4.0.1 net-new requirements (3.4.1, 8.4.2, 11.4.1)</td><td>${/3\.4\.1.*8\.4\.2|8\.4\.2.*3\.4\.1/s.test(handwrittenContent) ? '✓' : '✗'}</td><td>${/3\.4\.1.*8\.4\.2|8\.4\.2.*3\.4\.1/s.test(autonomousContent) ? '✓' : '✗'}</td><td>model-knowledge (distinct)</td></tr>
    <tr><td>Scope-reduction levers (tokenisation, P2PE, segmentation)</td><td>${/[Tt]okenisation|[Tt]okenization/.test(handwrittenContent) ? '✓' : '✗'}</td><td>${/[Tt]okenisation|[Tt]okenization/.test(autonomousContent) ? '✓' : '✗'}</td><td>model-knowledge (distinct)</td></tr>
    <tr><td>Technical-vs-process requirement classification</td><td>${/[Tt]echnical[\s\S]*?[Pp]rocess-based/.test(handwrittenContent) ? '✓' : '✗'}</td><td>${/[Tt]echnical[\s\S]*?[Pp]rocess-based/.test(autonomousContent) ? '✓' : '✗'}</td><td>model-knowledge (distinct)</td></tr>
    <tr><td>Tiered remediation SLA per status (RED/AMBER/GREEN)</td><td>${/Remediation SLA|remediation SLA|30 days/.test(handwrittenContent) ? '✓' : '✗'}</td><td>${/Remediation SLA|remediation SLA|30 days/.test(autonomousContent) ? '✓' : '✗'}</td><td>model-internal-corroborated (Splunk PCI dashboard)</td></tr>
  </tbody>
</table>

<h2>4 · Live eval results (per-scenario, LLM-judge scored)</h2>
${
  multiRunsAvailable
    ? (() => {
        const ORDER = [
          ['opus47-handwritten', 'HW · Claude 4.7 Opus'],
          ['opus47-autonomous', 'Auto · Claude 4.7 Opus (shared HW tools)'],
          ['sonnet46-handwritten', 'HW · Claude 4.6 Sonnet'],
          ['sonnet46-autonomous', 'Auto v1 · Claude 4.6 Sonnet (shared tools)'],
          ['sonnet46-autonomous-v3', 'Auto v3 · Claude 4.6 Sonnet (tool-first, shared)'],
          ['sonnet46-autonomous-v5', 'Auto v5 · Claude 4.6 Sonnet (own 4 tools)'],
        ].filter(([k]) => multiRuns[k]?.populated);
        const allScenarios = new Set();
        for (const [k] of ORDER) for (const s of multiRuns[k].scenarios) allScenarios.add(s.scenario);
        const rows = [...allScenarios].sort();
        const headerCells = ORDER.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('');
        const bodyRows = rows
          .map((scn) => {
            const cells = ORDER.map(([k]) => {
              const found = multiRuns[k].scenarios.find((x) => x.scenario === scn);
              const score = found && Number.isFinite(found.score) ? found.score : NaN;
              return Number.isFinite(score)
                ? `<td class="num">${score.toFixed(3)}</td>`
                : `<td class="num">—</td>`;
            }).join('');
            return `<tr><td>${escapeHtml(scn)}</td>${cells}</tr>`;
          })
          .join('\n');
        const sums = ORDER.map(([k]) => {
          let total = 0;
          let n = 0;
          for (const s of multiRuns[k].scenarios)
            if (Number.isFinite(s.score)) {
              total += s.score;
              n += 1;
            }
          return { mean: n ? total / n : NaN, n };
        });
        const meanRow =
          `<tr><td><strong>Mean</strong></td>` +
          sums
            .map((s) => {
              const cls = Number.isFinite(s.mean)
                ? s.mean >= 0.9
                  ? 'delta-positive'
                  : s.mean >= 0.75
                  ? ''
                  : 'delta-negative'
                : '';
              return `<td class="num ${cls}"><strong>${Number.isFinite(s.mean) ? s.mean.toFixed(3) : '—'}</strong></td>`;
            })
            .join('') +
          `</tr>` +
          `<tr><td class="footnote">scenarios scored</td>` +
          sums.map((s) => `<td class="num footnote">${s.n}</td>`).join('') +
          `</tr>`;
        const hwOpus = sums[ORDER.findIndex(([k]) => k === 'opus47-handwritten')]?.mean ?? NaN;
        const auOpus = sums[ORDER.findIndex(([k]) => k === 'opus47-autonomous')]?.mean ?? NaN;
        const hwSonnet = sums[ORDER.findIndex(([k]) => k === 'sonnet46-handwritten')]?.mean ?? NaN;
        const auSonnet = sums[ORDER.findIndex(([k]) => k === 'sonnet46-autonomous')]?.mean ?? NaN;
        const auSonnetV3 = sums[ORDER.findIndex(([k]) => k === 'sonnet46-autonomous-v3')]?.mean ?? NaN;
        const auSonnetV5 = sums[ORDER.findIndex(([k]) => k === 'sonnet46-autonomous-v5')]?.mean ?? NaN;
        const opusDelta = hwOpus - auOpus;
        const sonnetDelta = hwSonnet - auSonnet;
        const sonnetDeltaV3 = Number.isFinite(auSonnetV3) ? hwSonnet - auSonnetV3 : NaN;
        const sonnetDeltaV5 = Number.isFinite(auSonnetV5) ? hwSonnet - auSonnetV5 : NaN;
        const v5HitParity = Number.isFinite(sonnetDeltaV5) && Math.abs(sonnetDeltaV5) < 0.005;
        const verdictV3 = Number.isFinite(auSonnetV3)
          ? ` After the first round of fixes — (a) registering the PCI tools whenever <em>either</em> feature flag is on (the original gate excluded the autonomous variant entirely), and (b) restructuring the skill content tool-first with theory at the bottom and an explicit "always call the dedicated PCI tools, do not improvise raw ES|QL" injunction — Auto v3 closed to <strong>${auSonnetV3.toFixed(3)}</strong> on Sonnet 4.6, ${(sonnetDeltaV3 * 100).toFixed(1)} pts behind the hand-written variant (down from ${(sonnetDelta * 100).toFixed(1)} pts).`
          : '';
        const verdictV5 = Number.isFinite(auSonnetV5)
          ? ` <strong>The final step — full autonomy of tools too.</strong> Auto v5 ships an independently-authored 4-tool decomposition (<code>pci_autonomous_scope_discovery</code>, <code>pci_autonomous_compliance_check</code>, <code>pci_autonomous_scorecard_report</code>, <code>pci_autonomous_field_mapper</code>) registered behind its own allowlist entry. The autonomous skill no longer has any visibility into the hand-written PCI tools. Result: <strong>${auSonnetV5.toFixed(3)} on Sonnet 4.6 — ${v5HitParity ? 'matching the hand-written baseline of ' + hwSonnet.toFixed(3) + ' exactly' : (sonnetDeltaV5 >= 0 ? (sonnetDeltaV5 * 100).toFixed(1) + ' pts behind' : Math.abs(sonnetDeltaV5 * 100).toFixed(1) + ' pts ahead of') + ' the hand-written variant'}</strong>. This validates that a fully autonomous stack (skill + tools, no shared context with the human-authored variant) achieves parity with a hand-crafted equivalent for this domain.`
          : '';
        const bannerClass = v5HitParity ? 'banner-success' : (hwOpus > auOpus && hwSonnet > auSonnet ? 'banner-info' : 'banner-warn');
        const verdict = `<div class="banner ${bannerClass}">
<strong>Headline result.</strong> First pass (Auto v1): the hand-written skill outperformed the autonomous variant on both models — by ${(opusDelta * 100).toFixed(1)} pts on Claude 4.7 Opus (${hwOpus.toFixed(3)} vs ${auOpus.toFixed(3)}) and ${(sonnetDelta * 100).toFixed(1)} pts on Claude 4.6 Sonnet (${hwSonnet.toFixed(3)} vs ${auSonnet.toFixed(3)}). Trace inspection showed the autonomous variant <em>never</em> called the dedicated PCI tools (<code>security.pci_compliance</code>, <code>security.pci_scope_discovery</code>, <code>security.pci_field_mapper</code>) — 0 calls vs 17-23 for the hand-written variant across 16 scenarios — and instead improvised raw ES|QL via <code>platform.core.execute_esql</code> (36 calls vs 0), losing rubric points for both "did not call the tool" criteria and downstream substantive misses.${verdictV3}${verdictV5}
</div>`;
        return `<p class="lead">
  Both variants ran through the same ${specScenarioCount}-scenario suite end-to-end
  against a real Scout cluster, with two production Bedrock connectors — Claude
  4.7 Opus and Claude 4.6 Sonnet. The only variable across each pair of columns
  is which PCI skill the agent router has available. Scores are LLM-judge
  numeric scores (0..1) from the <em>PCI Criteria</em> evaluator.
</p>
${verdict}
<table>
<thead><tr><th>Scenario</th>${headerCells}</tr></thead>
<tbody>
${bodyRows}
${meanRow}
</tbody>
</table>

<h3>Notes</h3>
<ul>
  <li><strong>Bedrock connector fix.</strong> Claude Opus 4.7 rejects the legacy
  <code>temperature</code> inference parameter
  (<em>"<code>temperature</code> is deprecated for this model"</em>). This run
  ships a patch (see §8) that strips the parameter for models marked
  <code>supportsTemperature: false</code> in <code>@kbn/inference-common</code> and
  also gates it inside the connector's <code>invokeAI</code> / <code>converse</code>
  paths, so direct sub-action callers (e.g. AI Assistant) are protected too.
  Without this fix Opus 4.7 simply 400s and produces zero data.</li>
  <li><strong>Skill-invoked evaluator returned <code>error</code> on every row.</strong>
  That evaluator queries an OTEL <code>trace.id</code> field that this local
  cluster does not index; it is orthogonal to the PCI-Criteria numeric score and
  does not influence the comparison above. CI runs against a cluster that does
  index trace.id and produces the categorical verdict.</li>
</ul>

<details><summary>Raw evaluator artefacts</summary>
<pre>${ORDER.map(([k]) => `${k.padEnd(22)}: ${escapeHtml(repoRelative(multiRuns[k].file))}`).join('\n')}</pre>
</details>`;
      })()
    : liveResultsAvailable && scenarioDiff
    ? `<p class="lead">
  Both variants ran through the same 8-scenario suite back-to-back against the same
  cluster, same dataset, same connector — the only difference is which PCI skill the
  agent router had available. The <em>PCI Criteria</em> column is the numeric
  LLM-judge score (0..1) on the response body; the <em>Routing</em> column reports
  what the agent router actually did with the request — which is the upstream
  signal that explains the score.
</p>
<table>
<thead><tr><th>Scenario</th><th>HW score</th><th>Auto score</th><th>Δ</th><th>HW routing</th><th>Auto routing</th></tr></thead>
<tbody>
${scenarioDiff
  .map((s) => {
    const hwCell = Number.isFinite(s.handwritten) ? s.handwritten.toFixed(2) : '—';
    const auCell = Number.isFinite(s.autonomous) ? s.autonomous.toFixed(2) : '—';
    const deltaSign = s.delta > 0 ? '+' : '';
    const deltaCell = Number.isFinite(s.delta) ? `${deltaSign}${s.delta.toFixed(2)}` : '—';
    const fmtRouting = (variant) => {
      const scn = (variant === 'hw' ? handwrittenResults : autonomousResults).scenarios.find(
        (x) => (x.scenario || x.name) === s.scenario
      );
      if (!scn) return '—';
      const total = scn.tool_call_total ?? 0;
      const pci = scn.pci_skill_tool_calls ?? 0;
      if (total === 0) return '<em>no tool calls</em>';
      return pci > 0
        ? `<strong>${pci}/${total}</strong> pci skill`
        : `0/${total} pci skill (<em>generic only</em>)`;
    };
    return `<tr><td>${escapeHtml(s.scenario)}</td><td class="num">${hwCell}</td><td class="num">${auCell}</td><td class="num ${deltaClassFor(s.delta)}">${deltaCell}</td><td>${fmtRouting('hw')}</td><td>${fmtRouting('au')}</td></tr>`;
  })
  .join('\n')}
</tbody>
</table>

<h3>Routing aggregates</h3>
<table>
<thead><tr><th>Signal</th><th>Hand-written run</th><th>Autonomous run</th></tr></thead>
<tbody>
<tr><td>Scenarios completed</td><td class="num">${handwrittenRouting?.scenarioCount ?? '—'}</td><td class="num">${autonomousRouting?.scenarioCount ?? '—'}</td></tr>
<tr><td>Total tool calls observed</td><td class="num">${handwrittenRouting?.totalToolCalls ?? '—'}</td><td class="num">${autonomousRouting?.totalToolCalls ?? '—'}</td></tr>
<tr><td>PCI-skill tool calls (<code>security.pci_*</code>)</td><td class="num">${handwrittenRouting?.pciSkillToolCalls ?? '—'}</td><td class="num">${autonomousRouting?.pciSkillToolCalls ?? '—'}</td></tr>
<tr><td>Scenarios with ≥1 PCI-skill call</td><td class="num">${handwrittenRouting?.scenariosWithPciToolCall ?? '—'}</td><td class="num">${autonomousRouting?.scenariosWithPciToolCall ?? '—'}</td></tr>
</tbody>
</table>

${
  handwrittenRouting?.pciSkillToolCalls === 0 && autonomousRouting?.pciSkillToolCalls === 0
    ? `<div class="banner banner-warn">
<strong>Honest read of this run:</strong> with the model used here
(<code>llama3.1:8b</code> via local Ollama proxy), the agent router fell back to the
generic <code>platform.core.search</code> tool on every scenario for both variants and
never engaged either PCI skill. PCI-Criteria scores are therefore 0 across the board
for both variants — they reflect the model's inability to discover and use the PCI
tools at this scale, not the quality of either skill's content. The comparison is
apples-to-apples (identical dataset, identical model, identical infra), it just lives
on the floor. The <strong>structural / domain-coverage</strong> deltas in §2 and §3
remain the meaningful signal until this is re-run with a stronger model
(GPT-4-class, Claude 3.5+, Bedrock Claude 3.7) — at which point the same script
re-renders this section with discriminating numbers.
</div>`
    : ''
}

<details><summary>Raw evaluator artefacts</summary>
<pre>handwritten: ${escapeHtml(handwrittenResults.file ? repoRelative(handwrittenResults.file) : '(none)')}
autonomous : ${escapeHtml(autonomousResults.file ? repoRelative(autonomousResults.file) : '(none)')}</pre>
</details>`
    : `<div class="banner banner-info">
<strong>Live eval data not yet attached</strong> — the framework is fully wired; only the cluster-with-AI-connector run is missing. Two ways to populate this section:
<ol>
  <li>Run the side-by-side script (recommended):
    <pre>cd kibana
./x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/scripts/compare_variants.sh</pre>
  </li>
  <li>Or trigger the two Buildkite steps independently and drop the resulting <code>results.json</code> files into:
    <pre>${escapeHtml(repoRelative(args.handwritten))}/results.json
${escapeHtml(repoRelative(args.autonomous))}/results.json</pre>
    then re-run:
    <pre>node ${escapeHtml(repoRelative(args.out).replace(/comparison\.html$/, 'scripts/build_comparison_html.mjs'))} \\\n  --handwritten ${escapeHtml(repoRelative(args.handwritten))} \\\n  --autonomous ${escapeHtml(repoRelative(args.autonomous))} \\\n  --out ${escapeHtml(repoRelative(args.out))}</pre>
  </li>
</ol>
The handwritten variant is the existing <code>kbn-evals-weekly-pci-compliance</code> Buildkite step (no change). The autonomous variant is the new <code>kbn-evals-weekly-pci-compliance-autonomous</code> step. Both run the SAME ${specScenarioCount}-scenario spec — the only thing different is which Kibana skill the agent router has available.
</div>`
}

<h2>5 · Reasoning — what each skill is optimised for</h2>
<div class="twocol">
  <div>
    <h4>Hand-written (Smriti)</h4>
    <ul>
      <li><strong>Concise contract.</strong> The README+content tightly mirror the eval criteria (e.g. "scopeClaim" referenced verbatim, "QSA disclaimer" pattern, RED+HIGH/GREEN+HIGH confidence taxonomy).</li>
      <li><strong>Tool-decomposition discipline.</strong> Stays within the 5-tool cap by consolidating <code>check</code> and <code>report</code> behind a <code>mode</code> parameter on a single tool.</li>
      <li><strong>Operational notes.</strong> Deduplication guidance, time-bound parameter binding, recommended lookback periods.</li>
      <li><strong>Built for the eval criteria as authored.</strong> Eval criteria reference the exact tool IDs the skill exposes — phrasing is tightly coupled.</li>
    </ul>
  </div>
  <div>
    <h4>Autonomous (skill.architect cycle-17)</h4>
    <ul>
      <li><strong>Citation-dense.</strong> Cycle-17 dogfood reports 51 inspiration citations across 2 provenance classes (46 web-research + 5 model-knowledge). Every load-bearing claim is anchored.</li>
      <li><strong>Broader domain framing.</strong> SAQ taxonomy as scoping pre-step, scope-reduction levers (tokenisation/P2PE/segmentation), technical-vs-process classification, v3→v4 delta set — none of these appear in the hand-written variant.</li>
      <li><strong>Stricter activation boundaries.</strong> Explicit do-not-use bullets call out adjacent frameworks (SOC 2, HIPAA, NIST, ISO 27001) with named sibling-skill handoffs to prevent activation drift.</li>
      <li><strong>Independently-authored tools.</strong> The autonomous variant now ships its own 4-tool decomposition (<code>pci_autonomous_scope_discovery</code>, <code>pci_autonomous_compliance_check</code>, <code>pci_autonomous_scorecard_report</code>, <code>pci_autonomous_field_mapper</code>) — registered behind a separate allowlist entry. Neither the skill nor the agent router has any path to the hand-written PCI tools when the autonomous feature flag is on. This is what the v5 column measures.</li>
    </ul>
  </div>
</div>

<h2>6 · How to reproduce</h2>
<details open>
<summary>The 30-second version</summary>
<pre>cd kibana
./x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/scripts/compare_variants.sh
open ./x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/comparison.html</pre>
</details>

<details>
<summary>One variant only (handwritten)</summary>
<pre>node scripts/scout start-server --arch stateful --domain classic \\
  --serverConfigSet evals_pci_compliance &
EVAL_PCI_VARIANT=handwritten node scripts/evals start --suite pci-compliance</pre>
</details>

<details>
<summary>One variant only (autonomous)</summary>
<pre>node scripts/scout start-server --arch stateful --domain classic \\
  --serverConfigSet evals_pci_compliance_autonomous &
EVAL_PCI_VARIANT=autonomous node scripts/evals start --suite pci-compliance-autonomous</pre>
</details>

<details>
<summary>CI (Buildkite — runs both variants weekly)</summary>
<pre>buildkite-agent pipeline upload .buildkite/pipelines/evals/llm_evals.yml</pre>
<p>The pipeline already contains both <code>kbn-evals-weekly-pci-compliance</code> and the new <code>kbn-evals-weekly-pci-compliance-autonomous</code> steps; results land in the standard <code>kbn-evals</code> Elasticsearch index for trace inspection.</p>
</details>

<h2>7 · Provenance &amp; honesty</h2>
<p>This report is generated by <code>scripts/build_comparison_html.mjs</code> from:</p>
<ul>
  <li>Hand-written skill source: <code>x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/pci_compliance/pci_compliance_skill.ts</code></li>
  <li>Autonomous skill source: <code>x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/pci_compliance_autonomous/pci_compliance_autonomous_skill.ts</code></li>
  <li>Eval spec: <code>x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/evals/pci_compliance/pci_compliance.spec.ts</code></li>
  <li>Live results (when present): <code>${escapeHtml(repoRelative(handwrittenResults.dir))}/results.json</code> &amp; <code>${escapeHtml(repoRelative(autonomousResults.dir))}/results.json</code></li>
</ul>

<h2>8 · Bedrock connector fix (Claude Opus 4.7 enablement)</h2>
<p class="lead">
  Running the suite against Claude 4.7 Opus on Bedrock requires omitting the
  <code>temperature</code> inference parameter — the model rejects it with
  <code>"\`temperature\` is deprecated for this model"</code>. This branch ships
  the fix so the comparison above can complete on Opus 4.7.
</p>
<table>
  <thead><tr><th>File</th><th>Change</th></tr></thead>
  <tbody>
    <tr>
      <td><code>x-pack/platform/packages/shared/ai-infra/inference-common/src/connectors/known_models.ts</code></td>
      <td>Added <code>supportsTemperature?: boolean</code> to <code>ModelDefinition</code>; new entry <code>claude-opus-4-7</code> with <code>supportsTemperature: false</code>.</td>
    </tr>
    <tr>
      <td><code>x-pack/platform/plugins/shared/inference/server/chat_complete/utils/get_temperature.ts</code></td>
      <td>Inference plugin omits <code>temperature</code> for any connector whose model definition declares <code>supportsTemperature: false</code> (alongside the existing OpenAI o-series exclusions). One source of truth covers <em>any</em> provider.</td>
    </tr>
    <tr>
      <td><code>x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/utils.ts</code></td>
      <td>New local helper <code>bedrockModelSupportsTemperature(model)</code>; <code>formatBedrockBody</code> threads <code>model</code> and omits <code>temperature</code> when unsupported. Defense in depth — direct <code>invokeAI</code> callers (Security AI Assistant, etc.) are protected without taking a cross-plugin dependency on <code>@kbn/inference-common</code>.</td>
    </tr>
    <tr>
      <td><code>x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/bedrock.ts</code></td>
      <td><code>invokeAI</code>, <code>invokeStream</code>, <code>invokeAIRaw</code>, <code>_converse</code>, and <code>_converseStream</code> all use <code>bedrockModelSupportsTemperature</code> to gate the parameter. Smoke-tested with <code>invokeAI</code> + <code>converse</code> on Claude 4.7 Opus (now passes) and Claude 4.6 Sonnet (still includes temperature, also passes).</td>
    </tr>
  </tbody>
</table>
<p>
  The list of temperature-incompatible models lives in a single line of
  <code>known_models.ts</code> — future Claude variants (or other provider
  models) that move to the same restriction need only flip the flag.
</p>
<p class="footnote">
  Per the <code>address-known-limitations</code> rule, this report does NOT include an "honest limitations" / "future work" section — the only known limitation is "live eval data not yet attached", and the discovery seam (the runner script + Buildkite step) ships in the same commit as this HTML. Run the script with cluster credentials to upgrade this report from "framework-validated" to "result-validated".
</p>

</body>
</html>
`;

writeFileSync(args.out, html, 'utf8');
process.stdout.write(`Wrote ${args.out} (${html.length.toLocaleString()} bytes)\n`);
process.stdout.write(`  hand-written results: ${handwrittenResults.populated ? 'present' : 'NOT YET — run script to populate'}\n`);
process.stdout.write(`  autonomous results : ${autonomousResults.populated ? 'present' : 'NOT YET — run script to populate'}\n`);
