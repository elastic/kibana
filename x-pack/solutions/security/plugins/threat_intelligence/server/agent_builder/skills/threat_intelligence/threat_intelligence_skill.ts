/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  THREAT_INTELLIGENCE_SKILL_ID,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common';
import {
  searchReportsTool,
  ingestReportTool,
  huntBehaviorTool,
  createSubscriptionTool,
  listSubscriptionsTool,
  coverageGapTool,
} from '../../tools';

/**
 * Source-agnostic threat intelligence skill.
 *
 * Phase A surface: external feeds + analyst paste + behavioral hunting.
 * Phase C will add `threat_intel.generalize_from_telemetry` (alert -> durable rule
 * feedback loop) — schema and slot accounting reserve room for it.
 *
 * Description string is the discoverability surface — keep the user-facing
 * phrasings broad ("threat intel", "CISO News", "vendor advisory", ...) but do NOT
 * promise telemetry-input/feedback-loop capability in v1; that wording is
 * reserved for Phase C so the agent's tool selector doesn't oversell.
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
    'them against the canonical Kibana ATT&CK catalog. ' +
    'Manage scheduled email/Slack digest subscriptions. ' +
    'Use when the user asks about: threat intel, CISO News, weekly digest, emerging threats, ' +
    'CVE in the wild, vendor advisory, incident postmortem, hunt for the behavior class, or ' +
    'build a durable detection from this hash.',
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
  the \`threat-reports-*\` data stream. Use as the entry point for digest/topic
  queries. Returns the top reports across all sources.
- **${THREAT_INTEL_TOOL_IDS.ingestReport}** — Ingest a single report (URL/text/
  vendor advisory pasted by the user) into \`threat-reports-*\`. Content-fingerprinted
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
  in \`threat-reports-*\` against enabled Detection Engine rules and return
  uncovered techniques scoped to a time window + tag set. The output renders as
  a \`threat-intel-mitre-heatmap\` attachment with \`mode: "coverage"\` (covered
  cells render green, uncovered cells render red). Use when the user asks
  "what's hot that I don't cover?" or before \`hunt_behavior\` to prioritize.
- **${THREAT_INTEL_TOOL_IDS.createSubscription}** — Create a scheduled digest
  subscription (email/Slack). Optional \`template_id\` bootstraps the form with
  pre-staged defaults (\`daily-threat-debrief\`, \`weekly-ciso-digest\`,
  \`ransomware-watch\`). With \`confirm=false\` the tool returns proposed
  parameters for an editable confirmation card; the card submits directly to
  \`/internal/threat_intelligence/subscriptions/submit\` so a follow-up
  \`confirm=true\` call is only needed for non-interactive callers.
- **${THREAT_INTEL_TOOL_IDS.listSubscriptions}** — List the user's active
  subscriptions for inspection or edit.

Registry tools available via this skill:
- \`security.create_detection_rule\` — AI-driven Detection Engine rule creation
  (gated behind \`aiRuleCreationEnabled\`; see degradation rule below).
- \`security.security_labs_search\` — search Elastic Security Labs publications.
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

1. Call \`${THREAT_INTEL_TOOL_IDS.createSubscription}\` with \`confirm=false\`
   (and optionally a \`template_id\` such as \`"daily-threat-debrief"\`); the
   response carries \`status: pending_confirmation\` plus the proposed shape.
2. Render a \`threat-intel-subscription-confirmation\` attachment with the
   proposed parameters. The card is editable inline — the user can adjust
   tags, severity, schedule, and delivery before Submit.
3. The Submit button posts directly to
   \`/internal/threat_intelligence/subscriptions/submit\` so the agent does
   NOT need to be re-invoked with \`confirm=true\`. Only call this tool a
   second time with \`confirm=true\` when acting non-interactively (e.g.
   from a workflow with no human in the loop).

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

Phrasings reserved for Phase C (do NOT promise these in v1): "generalize this
alert", "this alert keeps firing on rotating hashes — build a durable rule".
`,
  getInlineTools: () => [
    searchReportsTool,
    ingestReportTool,
    huntBehaviorTool,
    coverageGapTool,
    createSubscriptionTool,
    listSubscriptionsTool,
    // 6 inline (cap is 7). One slot reserved for Phase C
    // (`threat_intel.generalize_from_telemetry`).
  ],
  getRegistryTools: () => [
    'security.create_detection_rule',
    'security.security_labs_search',
    THREAT_INTEL_TOOL_IDS.extractIocs, // demoted to registry — Workflow 2 calls it directly
    platformCoreTools.cases,
  ],
});
