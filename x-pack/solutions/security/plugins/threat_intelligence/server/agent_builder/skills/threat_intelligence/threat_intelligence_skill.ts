/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  ANALYSE_ENVIRONMENT_API_PATH,
  COVERAGE_GAP_API_PATH,
  DELETE_SUBSCRIPTION_API_PATH,
  EXTRACT_IOCS_API_PATH,
  GENERALIZE_FROM_TELEMETRY_API_PATH,
  HUNT_BEHAVIOR_API_PATH,
  HUNT_FOR_THREAT_API_PATH,
  INGEST_REPORT_API_PATH,
  LIST_SUBSCRIPTIONS_API_PATH,
  SEARCH_REPORTS_API_PATH,
  SUBMIT_SUBSCRIPTION_API_PATH,
  THREAT_INTELLIGENCE_SKILL_ID,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common';
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
 * Per the Agent Builder architecture guidance, this skill is **knowledge,
 * not execution**: it documents the threat-intelligence HTTP endpoints
 * the orchestrating agent should call via `execute_workflow_step` with
 * `kibana-request`. Business logic lives in `server/services/` behind the
 * routes; tools are thin portability wrappers retained only so 3rd party
 * agents that can't reach Kibana APIs natively still have a callable
 * surface.
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

## Architecture: Routes Are the Canonical Execution Surface

This skill documents internal HTTP routes; **execution happens through
\`execute_workflow_step\` with \`kibana-request\`**. Business logic lives in
the plugin's shared service modules (\`server/services/\`) behind those
routes. The same routes are also callable from ECLI, workflow steps, and
3rd party agents — no rework required as new callers appear.

The legacy inline tool list (\`threat_intel.search_reports\`, etc.) is a
**thin portability wrapper** for agents that can't reach Kibana APIs
natively (Claude, Cursor). They delegate to the same shared services
these routes call. **Inside Kibana, prefer the routes.**

## Detection Model

This skill operates across two implemented detection layers:

1. **IOC matching (Layer 1)** — Brittle. Adversaries rotate identifiers cheaply.
   Used for retro correlation only ("we saw this hash 3 days ago in our environment").
2. **Behavioral Detection Engine rules (Layer 2)** — Durable. Constrained by the OS,
   not the adversary. The primary output of \`hunt_behavior\` →
   \`security.create_detection_rule\`.

A third layer — long-running ES|QL behavioral detection on streams data via the
\`streams\` plugin's Query Knowledge Indicators — is described in
\`docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md\` but is **not
implemented in this release**. Do not promise Streams Query KIs to the user
until the cross-team contract in that RFC ships.

The headline claim: **IOC matching is brittle because adversaries rotate
identifiers; behavior is durable because it's constrained by the OS.**

## HTTP Endpoints (Canonical Execution Surface)

All paths are scoped to \`/internal/threat_intelligence/...\`. The agent
should invoke them with \`execute_workflow_step\` using a \`kibana-request\`
step (\`method: POST\`, \`path: <one of below>\`, \`body: { ... }\`). Each
endpoint is gated by the threat-intelligence Kibana feature privilege
tier listed.

### \`POST ${SEARCH_REPORTS_API_PATH}\` (read)
Hybrid semantic + BM25 search over \`.kibana-threat-reports-*\`. Use as
the entry point for digest / topic queries. Body: \`{ query, size?,
source_types?, min_severity?, time_range?, categories?, regions? }\`.
Returns \`{ total, reports[] }\`.

### \`POST ${INGEST_REPORT_API_PATH}\` (write)
Ingest one analyst-paste / ad-hoc URL / vendor advisory into the
threat-reports data stream. Content-fingerprinted — re-pasting the same
content is a no-op. Body: \`{ title, body_text, source_name, source_url?,
severity?, language? }\`. Returns \`{ status: 'ingested' | 'duplicate',
report_id, content_fingerprint, message }\`.

### \`POST ${HUNT_BEHAVIOR_API_PATH}\` (read)
Two-step extraction: (1) LLM extracts candidate MITRE ATT&CK technique
IDs with evidence quotes; (2) each candidate is validated against the
canonical Kibana ATT&CK catalog. Returns surviving behaviors enriched
with technique name, tactics, parent-technique metadata, severity, risk
score, a stable \`finding_id\`, a \`proposed_esql_rule\` body ready for
handoff to \`security.create_detection_rule\`, and one
\`attachment_hints[]\` entry per finding. Body: \`{ text, report_id?,
llm_confidence_threshold? }\`. Returns 503 when no GenAI connector is
configured — fall back to IOC matching.

### \`POST ${HUNT_FOR_THREAT_API_PATH}\` (read)
Active forward hunt across the customer environment indices
(\`.alerts-security.alerts-*\`, \`metrics-endpoint.*\`,
\`logs-vulnerability.*\`, \`logs-aws.*\`, \`logs-network_traffic.*\`) for a
report's IOCs and ATT&CK technique IDs. Returns the top matching
documents AND an \`affected_assets\` aggregation (unique hosts + users).
Body: \`{ report_id?, iocs?, techniques?, time_range?, size?, max_assets? }\`.
Either \`report_id\` or explicit \`iocs[]\` / \`techniques[]\` is required.

### \`POST ${COVERAGE_GAP_API_PATH}\` (read)
Join in-the-wild ATT&CK techniques in \`.kibana-threat-reports-*\` against
enabled Detection Engine rules and return uncovered techniques scoped to
a time window + tag set. The \`attachment_hint\` payload renders as a
\`threat-intel-mitre-heatmap\` attachment with \`mode: "coverage"\`. Body:
\`{ time_range, tags?, source_types?, min_severity?, max_techniques? }\`.

### \`POST ${GENERALIZE_FROM_TELEMETRY_API_PATH}\` (write)
Phase C — closes the brittle-alert → durable-behavioral-rule loop.
Pre-fetched alert samples in, validated behaviors out (same shape as
\`hunt_behavior\`); a synthetic \`source.type: 'telemetry'\` row is
persisted to the threat-reports data stream so the same finding shows up
in \`coverage_gap\` / \`search_reports\` / the dashboard. Body: \`{ question,
alerts: [{ alert_id, rule_name?, technique_ids?, summary }],
llm_confidence_threshold?, persist_synthetic_report? }\`. Returns 503 when
no GenAI connector is configured.

### \`POST ${EXTRACT_IOCS_API_PATH}\` (read)
Fast regex-based IOC extraction (hashes, IPs, domains, URLs). No LLM.
Body: \`{ text, defang? }\`. Returns \`{ count, iocs[], ioc_set_hash }\`.

### \`POST ${ANALYSE_ENVIRONMENT_API_PATH}\` (read)
Coarse environment profile (active integration data streams + OS family
mix + cloud-provider mix). Call before recommending which threat-intel
sources to enable. Body: \`{ lookback_days?, index_patterns? }\`.

### Subscription routes
- \`POST ${SUBMIT_SUBSCRIPTION_API_PATH}\` (write) — persist a fully-formed subscription. Posted directly by the editable \`threat-intel-subscription-confirmation\` attachment. Body: \`{ tags, severity_threshold, schedule_rrule, delivery: { type, target, connector_id? }, template_id? }\`.
- \`POST ${LIST_SUBSCRIPTIONS_API_PATH}\` (read) — list active subscriptions visible from the current space. Body: \`{ size? }\`.
- \`POST ${DELETE_SUBSCRIPTION_API_PATH}\` (write) — remove a subscription by id. Body: \`{ subscription_id }\`.

## Other Tools the Skill Coordinates With

- \`security.create_detection_rule\` — AI-driven Detection Engine rule
  creation (gated behind \`aiRuleCreationEnabled\`).
- \`security.security_labs_search\` — search Elastic Security Labs publications.
- \`${platformCoreTools.cases}\` — open cases for critical findings.

## Orchestration Rules

### For digest queries ("what's new on X this week?")

1. Issue \`POST ${SEARCH_REPORTS_API_PATH}\` with the user's topic + time range.
2. For each high/critical-severity hit, optionally issue
   \`POST ${HUNT_BEHAVIOR_API_PATH}\` to extract behaviors.
3. Render as: \`threat-intel-mitre-heatmap\` attachment (top techniques) +
   \`threat-intel-report-table\` attachment (reports with embedded IOCs) +
   short prose summary. Optionally add \`threat-intel-severity-timeline\` when
   the time range is wider than 7 days.

### For analyst paste ("here's a Mandiant blog, what should we do?")

1. Issue \`POST ${INGEST_REPORT_API_PATH}\` with the pasted text and source name.
2. Issue \`POST ${HUNT_BEHAVIOR_API_PATH}\` against the same text using the
   returned \`report_id\` for provenance.
3. For each entry in the response's \`attachment_hints[]\` (one per
   surviving behavior), emit a \`threat-intel-finding-card\` attachment.
   The hint's \`payload_partial\` is already complete except for
   \`report_title\` and \`report_source_name\` — fill those in from the
   prior ingest / search response before emitting. Each card surfaces
   three action buttons: **Deploy** (copies the ES|QL body and opens the
   Detection Engine rule create page), **Dismiss** (client-side hide),
   and **Investigate** (opens a pre-populated Case).
4. Additionally, when \`security.create_detection_rule\` is available
   (\`aiRuleCreationEnabled\` experimental flag on), call it for the
   highest-confidence behavior with \`user_query\` describing the technique
   + evidence quote and \`behavior.proposed_esql_rule\` as the canonical
   query body, and render the resulting rule attachment alongside the
   finding cards. If the tool returns "not available", do nothing extra
   — the finding cards already let the analyst deploy via the UI.

### For coverage-gap queries ("what's hot that I don't cover?")

1. Issue \`POST ${COVERAGE_GAP_API_PATH}\` with the user's time range and
   any tag/source filters they specified.
2. Render the \`attachment_hint.payload\` as a \`threat-intel-mitre-heatmap\`
   attachment with \`mode: "coverage"\` — uncovered techniques render red.
3. For each uncovered technique, recommend issuing
   \`POST ${HUNT_BEHAVIOR_API_PATH}\` on the underlying reports to
   propose a durable rule.

### For subscription requests ("send me a weekly digest of...")

1. Resolve the proposed parameters (locally or via the
   \`manage_subscriptions\` portability tool with \`confirm=false\`); the
   resolved shape carries \`status: pending_confirmation\`.
2. Render a \`threat-intel-subscription-confirmation\` attachment with the
   proposed parameters. The card is editable inline — the user can adjust
   tags, severity, schedule, delivery, and connector id before Submit.
3. The Submit button posts directly to
   \`${SUBMIT_SUBSCRIPTION_API_PATH}\` so the agent does
   NOT need to be re-invoked. Only persist directly (POST to the submit
   route from the agent) when acting non-interactively.
4. For listing or removing subscriptions, issue
   \`POST ${LIST_SUBSCRIPTIONS_API_PATH}\` or
   \`POST ${DELETE_SUBSCRIPTION_API_PATH}\`.

### For environment-impact questions ("are we affected by this advisory?")

1. Optionally issue \`POST ${INGEST_REPORT_API_PATH}\` first if the
   advisory was pasted by the user; otherwise pick the relevant
   \`report_id\` via \`POST ${SEARCH_REPORTS_API_PATH}\`.
2. Issue \`POST ${HUNT_FOR_THREAT_API_PATH}\` with that \`report_id\`
   (or explicit \`iocs[]\` / \`techniques[]\` when the report has not been
   extracted yet). The route returns top matching documents and an
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
3. Issue \`POST ${GENERALIZE_FROM_TELEMETRY_API_PATH}\` with the
   user's analyst question and the alert samples. The route persists a
   synthetic \`.kibana-threat-reports-*\` row and returns the same
   \`behaviors\` + \`attachment_hints\` shape as
   \`POST ${HUNT_BEHAVIOR_API_PATH}\`.
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
(\`POST ${HUNT_BEHAVIOR_API_PATH}\` → \`security.create_detection_rule\`)
which is fully functional today.

### For critical findings

If \`POST ${HUNT_BEHAVIOR_API_PATH}\` reports any behavior with
\`severity: critical\` AND the source report mentions an active campaign,
open a case via \`${platformCoreTools.cases}\` so the user has a tracking
artifact regardless of whether the rule was created or queued.

## Portability Tools (3rd party agents only)

For agents that can't reach Kibana APIs natively, the same surface is
available as Agent Builder tools that delegate to the exact same shared
services these routes call:

- \`${THREAT_INTEL_TOOL_IDS.searchReports}\`
- \`${THREAT_INTEL_TOOL_IDS.ingestReport}\`
- \`${THREAT_INTEL_TOOL_IDS.huntBehavior}\`
- \`${THREAT_INTEL_TOOL_IDS.huntForThreat}\`
- \`${THREAT_INTEL_TOOL_IDS.coverageGap}\`
- \`${THREAT_INTEL_TOOL_IDS.generalizeFromTelemetry}\`
- \`${THREAT_INTEL_TOOL_IDS.manageSubscriptions}\`
- \`${THREAT_INTEL_TOOL_IDS.extractIocs}\` (registry)
- \`${THREAT_INTEL_TOOL_IDS.analyseEnvironment}\` (registry)

When invoked from inside Kibana, these tools merely re-execute the
service the corresponding route uses. Inside Kibana orchestration, prefer
the routes — the tools exist for portability.

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
    // 7 inline tools — at the hard cap. These are thin portability
    // wrappers around the canonical HTTP routes documented above; inside
    // Kibana the agent should prefer `execute_workflow_step` +
    // `kibana-request` against those routes, where practical.
  ],
  getRegistryTools: () => [
    'security.create_detection_rule',
    'security.security_labs_search',
    THREAT_INTEL_TOOL_IDS.extractIocs, // demoted to registry — Workflow 2 calls the service directly
    THREAT_INTEL_TOOL_IDS.analyseEnvironment,
    platformCoreTools.cases,
  ],
});
