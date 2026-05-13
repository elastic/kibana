/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { THREAT_INTELLIGENCE_SKILL_ID, THREAT_INTEL_TOOL_IDS } from '../../../../common';
import {
  searchReportsTool,
  ingestReportTool,
  huntBehaviorTool,
  manageSubscriptionsTool,
  coverageGapTool,
  huntForThreatTool,
  generalizeFromTelemetryTool,
} from '../../tools';

/**
 * Source-agnostic threat intelligence skill.
 *
 * Phase A + C surface: external feeds + analyst paste + behavioral hunting,
 * plus the alert-generalization feedback loop
 * (`threat_intel.generalize_from_telemetry`).
 *
 * Description string is the discoverability surface — keep the user-facing
 * phrasings broad ("threat intel", "CISO News", "vendor advisory",
 * "generalize this alert", ...) so the agent's tool selector finds the
 * skill from a wide range of analyst phrasings.
 */
export const threatIntelligenceSkill = defineSkillType({
  id: THREAT_INTELLIGENCE_SKILL_ID,
  name: THREAT_INTELLIGENCE_SKILL_ID,
  basePath: 'skills/security/intel',
  experimental: true,
  description:
    'Surface threat intelligence from external feeds (RSS, STIX/TAXII, vendor advisories) and ' +
    'analyst-pasted reports. Propose durable behavioral detection rules from the techniques ' +
    'described in those reports by extracting MITRE ATT&CK techniques with an LLM and validating ' +
    'them against the canonical Kibana ATT&CK catalog. Generalize sets of brittle alerts ' +
    '(firing on rotating IOCs) into durable behavioral rules. ' +
    'Manage scheduled email/Slack digest subscriptions. ' +
    'Use when the user asks about: threat intel, CISO News, weekly digest, emerging threats, ' +
    'CVE in the wild, vendor advisory, incident postmortem, hunt for the behavior class, ' +
    'build a durable detection from this hash, generalize this alert, or this alert keeps ' +
    'firing on rotating hashes.',
  content: `# Threat Intelligence Skill

## When to Use This Skill

Use this skill when the user:
- Asks for a digest/summary of recent threat intelligence on a topic, actor, or technique class
- Pastes a URL, blog post, vendor advisory, or postmortem and wants it ingested + analyzed
- Wants to subscribe to or manage scheduled threat-intel digests delivered via email/Slack
- Mentions \`CISO News\`, \`threat intel\`, \`emerging threats\`, \`CVE in the wild\`, \`vendor advisory\`
- Wants behavioral detection rules generated from a report (NOT just IOC matching)

Do **not** use this skill when:
- The user wants raw alert triage on existing detections (use the \`alert-analysis\` skill)
- The user wants a hypothesis-driven hunt across their own data (use the \`threat-hunting\` skill)
- The user is asking about PCI/SOC2/HIPAA compliance (use the \`pci-compliance\` skill)

## Detection Model

This skill operates across two implemented detection layers:

1. **IOC matching (Layer 1)** — Brittle. Adversaries rotate identifiers cheaply.
   Used for retro correlation only ("we saw this hash 3 days ago in our environment").
2. **Behavioral Detection Engine rules (Layer 2)** — Durable. Constrained by the OS,
   not the adversary. The primary output of \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` →
   \`security.create_detection_rule\`.

A third layer — long-running ES|QL behavioral detection on streams data via the
\`streams\` plugin's Query Knowledge Indicators — is described in
\`docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md\` but is **not
implemented in this release**. Do not promise Streams Query KIs to the user
until the cross-team contract in that RFC ships.

The headline claim: **IOC matching is brittle because adversaries rotate
identifiers; behavior is durable because it's constrained by the OS.**

## Available Tools

- **${THREAT_INTEL_TOOL_IDS.searchReports}** — Hybrid semantic + BM25 search over
  the \`.kibana-threat-reports-*\` data stream. Use as the entry point for digest/topic
  queries. Returns the top reports across all sources.
- **${THREAT_INTEL_TOOL_IDS.ingestReport}** — Ingest a single report (URL/text/
  vendor advisory pasted by the user) into \`.kibana-threat-reports-*\`. Content-fingerprinted
  for dedup; re-pasting the same content is a no-op.
- **${THREAT_INTEL_TOOL_IDS.huntBehavior}** — Two-step extraction: (1) LLM
  extracts candidate MITRE ATT&CK technique IDs with evidence quotes; (2) each
  candidate is validated against the canonical Kibana ATT&CK catalog (the same
  source \`security.create_detection_rule\` uses). Hallucinated or unknown IDs are
  dropped. Surviving candidates return as behavioral findings enriched with
  technique name, tactics, parent-technique metadata, severity, risk score, a
  stable \`finding_id\`, and a \`proposed_esql_rule\` body ready for handoff to
  \`security.create_detection_rule\`. The tool result also includes one
  \`attachment_hints[]\` entry per finding — the agent renders each as a
  \`threat-intel-finding-card\` attachment with Deploy / Dismiss /
  Investigate action buttons.
- **${THREAT_INTEL_TOOL_IDS.coverageGap}** — Join in-the-wild ATT&CK techniques
  in \`.kibana-threat-reports-*\` against enabled Detection Engine rules and return
  uncovered techniques scoped to a time window + tag set. The output renders as
  a \`threat-intel-mitre-heatmap\` attachment with \`mode: "coverage"\` (covered
  cells render green, uncovered cells render red). Use when the user asks
  "what's hot that I don't cover?" or before \`hunt_behavior\` to prioritize.
- **${THREAT_INTEL_TOOL_IDS.huntForThreat}** — Active forward hunt across the
  customer environment (\`.alerts-security.alerts-*\`, \`metrics-endpoint.*\`,
  \`logs-vulnerability.*\`, \`logs-aws.*\`, \`logs-network_traffic.*\`) for a
  report's IOCs and ATT&CK technique IDs. Returns the top matching documents
  AND an \`affected_assets\` aggregation (unique hosts + users currently
  matched). Use when the user asks "are we affected by this advisory?",
  "is X in our environment?", or "which hosts touched this campaign?".
  Distinct from \`hunt_behavior\` (which extracts behaviors into proposed
  Detection Engine rules) and from the retrospective
  \`hit_provenance_backfill\` workflow (which attributes existing alerts back
  to reports).
- **${THREAT_INTEL_TOOL_IDS.generalizeFromTelemetry}** — Closes the
  brittle-alert → durable-behavioral-rule feedback loop. Takes a pre-fetched
  set of \`.alerts-security.alerts-*\` samples (the agent pulls them via
  \`security.alerts\` first), runs the same behavioral extraction prompt as
  \`hunt_behavior\` against the alert summaries, validates candidates
  against the ATT&CK catalog, and persists a synthetic
  \`source.type: 'telemetry'\` row to \`.kibana-threat-reports-*\` so the same
  finding appears in \`coverage_gap\` / \`search_reports\` / the dashboard.
  Returns the same \`behaviors\` + \`attachment_hints\` shape as
  \`hunt_behavior\` so the downstream rendering and Detection Engine handoff
  are unchanged. Use when the user asks "generalize this alert", "this
  alert keeps firing on rotating hashes — make a durable rule", or "turn
  these detections into something the adversary can't sidestep".
- **${THREAT_INTEL_TOOL_IDS.manageSubscriptions}** — One tool, three actions:
  \`create\` / \`list\` / \`delete\`. For \`create\`, optional \`template_id\`
  bootstraps from a pre-staged preset (\`daily-threat-debrief\`,
  \`weekly-ciso-digest\`, \`ransomware-watch\`). With \`confirm=false\` the
  tool returns proposed parameters for an editable confirmation card; the
  card submits directly to
  \`/internal/threat_intelligence/subscriptions/submit\` so a follow-up
  \`confirm=true\` call is only needed for non-interactive callers.

Registry tools available via this skill:
- \`security.create_detection_rule\` — AI-driven Detection Engine rule creation
  (gated behind \`aiRuleCreationEnabled\`; see degradation rule below).
- \`security.security_labs_search\` — search Elastic Security Labs publications.
- \`${THREAT_INTEL_TOOL_IDS.analyseEnvironment}\` — coarse-grained environment
  profile (active data streams + OS mix + cloud-provider mix) for tailoring
  feed recommendations. Call before recommending which threat-intel sources
  to enable.
- \`${platformCoreTools.cases}\` — open cases for critical findings.

## Orchestration Rules

### For digest queries ("what's new on X this week?")

1. Call \`${THREAT_INTEL_TOOL_IDS.searchReports}\` with the user's topic + time range.
2. For each high/critical-severity hit, optionally call
   \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` to extract behaviors.
3. Render as: \`threat-intel-mitre-heatmap\` attachment (top techniques) +
   \`threat-intel-report-table\` attachment (reports with embedded IOCs) +
   short prose summary. Optionally add \`threat-intel-severity-timeline\` when
   the time range is wider than 7 days.

### For analyst paste ("here's a Mandiant blog, what should we do?")

1. Call \`${THREAT_INTEL_TOOL_IDS.ingestReport}\` with the pasted text and source name.
2. Call \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` against the same text using the
   returned \`report_id\` for provenance.
3. For each entry in the tool result's \`attachment_hints[]\` (one per
   surviving behavior), emit a \`threat-intel-finding-card\` attachment.
   The hint's \`payload_partial\` is already complete except for
   \`report_title\` and \`report_source_name\` — fill those in from the
   prior \`ingest_report\` (or \`search_reports\`) result before emitting.
   Each card surfaces three action buttons: **Deploy** (copies the ES|QL
   body and opens the Detection Engine rule create page), **Dismiss**
   (client-side hide), and **Investigate** (opens a pre-populated Case).
4. Additionally, when \`security.create_detection_rule\` is available
   (\`aiRuleCreationEnabled\` experimental flag on), call it for the
   highest-confidence behavior with \`user_query\` describing the technique
   + evidence quote and \`behavior.proposed_esql_rule\` as the canonical
   query body, and render the resulting rule attachment alongside the
   finding cards. If the tool returns "not available", do nothing extra
   — the finding cards already let the analyst deploy via the UI.

### For coverage-gap queries ("what's hot that I don't cover?")

1. Call \`${THREAT_INTEL_TOOL_IDS.coverageGap}\` with the user's time range and
   any tag/source filters they specified.
2. Render the \`attachment_hint.payload\` as a \`threat-intel-mitre-heatmap\`
   attachment with \`mode: "coverage"\` — uncovered techniques render red.
3. For each uncovered technique, recommend running
   \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` on the underlying reports to
   propose a durable rule.

### For subscription requests ("send me a weekly digest of...")

1. Call \`${THREAT_INTEL_TOOL_IDS.manageSubscriptions}\` with
   \`action="create"\`, \`confirm=false\` (and optionally a \`template_id\`
   such as \`"daily-threat-debrief"\`); the response carries
   \`status: pending_confirmation\` plus the proposed shape.
2. Render a \`threat-intel-subscription-confirmation\` attachment with the
   proposed parameters. The card is editable inline — the user can adjust
   tags, severity, schedule, delivery, and connector id before Submit.
3. The Submit button posts directly to
   \`/internal/threat_intelligence/subscriptions/submit\` so the agent does
   NOT need to be re-invoked with \`confirm=true\`. Only call this tool a
   second time with \`action="create"\` + \`confirm=true\` when acting
   non-interactively (e.g. from a workflow with no human in the loop).
4. For listing or removing existing subscriptions, call the same tool with
   \`action="list"\` or \`action="delete"\` (with \`subscription_id\`).

### For environment-impact questions ("are we affected by this advisory?")

1. Optionally call \`${THREAT_INTEL_TOOL_IDS.ingestReport}\` first if the
   advisory was pasted by the user; otherwise pick the relevant
   \`report_id\` via \`${THREAT_INTEL_TOOL_IDS.searchReports}\`.
2. Call \`${THREAT_INTEL_TOOL_IDS.huntForThreat}\` with that \`report_id\`
   (or explicit \`iocs[]\` / \`techniques[]\` when the report has not been
   extracted yet). The tool returns top matching documents and an
   \`affected_assets\` block (unique hosts + users).
3. Summarize the result in chat: counts per index, top affected hosts/users,
   and a recommended next step (open a case via \`${platformCoreTools.cases}\`
   when any host is matched in \`.alerts-security.alerts-*\`).

### For alert-generalization requests ("generalize this alert")

1. Call \`security.alerts\` to pull 3-10 recent samples of the alert
   pattern the user is asking about. Filter on
   \`kibana.alert.rule.name\` and/or a shared technique id when known.
2. For each alert, compose a one-paragraph \`summary\` of the relevant
   ECS fields (\`host.name\`, \`process.name\`, \`process.command_line\`,
   \`file.hash.sha256\`, \`source.ip\`, ...). Skip noisy fields that
   don't help characterize the behavior.
3. Call \`${THREAT_INTEL_TOOL_IDS.generalizeFromTelemetry}\` with the
   user's analyst question and the alert samples. The tool persists a
   synthetic \`.kibana-threat-reports-*\` row and returns the same
   \`behaviors\` + \`attachment_hints\` shape as \`hunt_behavior\`.
4. Emit one \`threat-intel-finding-card\` per surviving behavior (the
   hints already carry \`report_title\` / \`report_source_name\`). When
   \`security.create_detection_rule\` is available, call it for the
   highest-confidence behavior with the proposed ES|QL body.

### For Streams-hunt requests ("turn that behavior into a Streams KI")

If the user asks for a long-running Streams hunt, materialization of a
behavior into a Query KI, or anything that would land as a Streams-side
detection, respond that the cross-team Streams Query KI contract is not yet
implemented and point at \`docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md\`.
Continue serving the behavioral path through Layer 2
(\`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` → \`security.create_detection_rule\`)
which is fully functional today.

### For critical findings

If \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\` reports any behavior with
\`severity: critical\` AND the source report mentions an active campaign,
open a case via \`${platformCoreTools.cases}\` so the user has a tracking
artifact regardless of whether the rule was created or queued.

## Discoverability phrasings (do not require, just recognize)

The user may surface this skill with any of:
- "threat intel on Volt Typhoon"
- "CISO News digest"
- "what vendor advisories cover the XZ backdoor"
- "this Mandiant blog describes a new technique — build a detection"
- "incident postmortem to durable rule"
- "hunt for the behavior class behind these IOCs"
- "generalize this alert"
- "this alert keeps firing on rotating hashes — make a durable rule"
`,
  getInlineTools: () => [
    searchReportsTool,
    ingestReportTool,
    huntBehaviorTool,
    coverageGapTool,
    huntForThreatTool,
    manageSubscriptionsTool,
    generalizeFromTelemetryTool,
    // 7 inline tools — at the hard cap. Reordering or adding a new tool
    // requires demoting one of the above to the registry list below.
    // `analyse_environment` lives in the registry tool list since it is
    // invoked occasionally to tailor feed recommendations and does not
    // need a permanent inline slot.
  ],
  getRegistryTools: () => [
    'security.create_detection_rule',
    'security.security_labs_search',
    THREAT_INTEL_TOOL_IDS.extractIocs, // demoted to registry — Workflow 2 calls it directly
    THREAT_INTEL_TOOL_IDS.analyseEnvironment,
    platformCoreTools.cases,
  ],
});
