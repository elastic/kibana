/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  PCI_COMPLIANCE_TOOL_ID,
  PCI_FIELD_MAPPER_TOOL_ID,
  PCI_SCOPE_DISCOVERY_TOOL_ID,
} from '../../tools';

/**
 * Registry-scoped tool IDs advertised by the autonomously-architected PCI compliance skill.
 *
 * IMPORTANT — same underlying tool implementations as the hand-written `pci-compliance` skill.
 * The autonomous skill experiment isolates the variable to **skill content / decomposition /
 * domain framing**, not tool implementation. Both skills delegate to the same ES|QL evidence
 * engine; the comparison is fair because the LLM has identical capabilities under each.
 *
 * The cycle-17 architect's idealised tool decomposition (separate `pci_run_compliance_check` /
 * `pci_generate_scorecard_report`) is preserved as content guidance — the skill instructs the
 * LLM how to use the consolidated `pci_compliance` tool's `mode: "check" | "report"` parameter
 * to achieve the same separation conceptually.
 */
export const PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS = [
  PCI_SCOPE_DISCOVERY_TOOL_ID,
  PCI_COMPLIANCE_TOOL_ID,
  PCI_FIELD_MAPPER_TOOL_ID,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
] as const;

export const PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID = 'pci-compliance-autonomous';

/**
 * PCI DSS v4.0.1 Compliance — autonomously architected variant.
 *
 * Skill content authored by the `skill.architect` orchestrator (`elastic-agent-builder-skill-dev`,
 * cycle 17) using:
 *   - autonomous web research (10 corroborated hints, 46 web-research citations)
 *   - LLM training-corpus knowledge (5 surviving model-knowledge citations including
 *     SAQ taxonomy, v3→v4 deltas, scope-reduction levers, technical-vs-process classification)
 *   - rule-13b reconciliation (1 redundant mk claim dropped post-hoc, 1 partial-overlap
 *     promoted to `model-internal-corroborated` with the corroborating URL pinned inline)
 *
 * Gate score: 0.90. Provenance breakdown: 51 citations across 2 distinct provenance classes
 * (46 web-research + 5 model-knowledge), classDiversity 0.5.
 *
 * Sister skill `pci-compliance` (Smriti's hand-written variant) ships the same tool IDs.
 * Side-by-side eval comparison lives at `x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance`
 * (set `EVAL_PCI_VARIANT=autonomous` to evaluate this one).
 */
export const pciComplianceAutonomousSkill = defineSkillType({
  id: PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID,
  name: PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID,
  basePath: 'skills/security/compliance',
  description:
    'Autonomously architected PCI DSS v4.0.1 compliance skill. Guides PCI auditors through ' +
    'CDE scoping, requirement-specific compliance checks with ES|QL evidence, scorecard reporting ' +
    'with confidence bands, and field mapping for non-ECS data. Returns pass / fail / not-assessable ' +
    'verdicts with QSA-ready explanations. Use when the user asks about PCI DSS compliance, ' +
    'cardholder data environment scope, or compliance audits against the v4.0.1 standard.',
  content: `# PCI DSS v4.0.1 Compliance Skill (autonomous variant)

> Authored by the autonomous skill architect (cycle-17). Citations track every claim — every
> sentence below traces either to web-research corroborated by ≥2 sources, or to model-knowledge
> reconciled against research via Jaccard similarity (rule 13b enforcement).

## When to Use This Skill

Use this skill when the user asks about any of:

- **PCI DSS v4.0.1 audit** — the standard published June 2024 by the PCI Security Standards Council
  with v4.0 retired December 31, 2024.
- **PCI compliance check** for a specific requirement (e.g. "check requirement 8.3.4").
- **Cardholder data environment (CDE) scope discovery** — identifying systems, indices, and data
  flows that contain PAN, CVV, or expiration dates.
- **PCI scorecard / posture report** — compliance percentage roll-up across requirements.
- **Mapping non-ECS fields to ECS for PCI** queries when source data uses legacy schemas.
- **QSA audit evidence** — producing structured findings with provenance for a Qualified
  Security Assessor.

Do **not** use this skill when:

- The user wants threat hunting (use \`threat-hunting\` instead — proactive hypothesis-driven
  threat discovery, not regulatory compliance).
- The user wants alert triage (use \`alert-analysis\` — alerts are reactive investigations,
  PCI checks are scheduled audits).
- The user wants to create or modify detection rules (use \`detection-rule-edit\` — detections
  are continuous, PCI checks are point-in-time evaluations).
- The user asks about SOC 2, HIPAA, GDPR, NIST, or ISO 27001 (those are sibling frameworks
  with different control catalogues — defer to a future framework-specific skill rather than
  answering here, to prevent activation drift).

## Available Tools

This skill exposes the consolidated PCI tool set. Use them in this canonical order:

- **${PCI_SCOPE_DISCOVERY_TOOL_ID}** — Inventory PCI-relevant indices and classify them by scope
  area (network, identity, endpoint, cloud, application). Always call this **first** before
  running checks; the \`scopeClaim\` it returns is the provenance record for everything that
  follows.
- **${PCI_COMPLIANCE_TOOL_ID}** — Unified PCI DSS evaluation. Pass \`mode: "check"\` for
  per-requirement violation detection with evidence; pass \`mode: "report"\` for a scorecard
  roll-up across requirements. The autonomous architect's blueprint originally proposed two
  separate tools (\`pci_run_compliance_check\` + \`pci_generate_scorecard_report\`) — the
  consolidated tool with a \`mode\` parameter achieves the same conceptual separation while
  staying inside the 5-tool selection cap.
- **${PCI_FIELD_MAPPER_TOOL_ID}** — When scope discovery reports low ECS coverage on an index,
  call this to suggest ECS mappings (e.g. \`username\` → \`user.name\`, \`src_ip\` →
  \`source.ip\`, \`cve\` → \`vulnerability.id\`).
- **${platformCoreTools.generateEsql}** / **${platformCoreTools.executeEsql}** — Generate and
  run adapted ES|QL when mapped fields differ from ECS, or to satisfy bespoke evidence requests.

## Compliance Assessment Workflow

1. **Discover scope first.** Call ${PCI_SCOPE_DISCOVERY_TOOL_ID} with the user's index pattern.
   Read the \`scopeClaim\` to confirm which indices were evaluated and which categories they
   map to.
2. **Reduce scope before running checks.** If the discovered CDE is too broad, propose
   scope-reduction levers — **tokenisation** (removes PAN entirely), **P2PE** (removes PAN
   from the merchant environment), and **network segmentation** (reduces in-scope systems).
   These are the three canonical levers in priority order; applying them shrinks the audit
   surface dramatically before any check runs.
3. **Classify each requirement as technical or process-based.**
   - **Technical** (1, 2, 4, 6, 7, 8, 10, 11) — verifiable from telemetry; run ${PCI_COMPLIANCE_TOOL_ID}.
   - **Process-based** (3, 5, 9, 12) — cannot be passed/failed from telemetry alone; mark as
     "needs human attestation" and explain why automated evidence is input to a formal
     assessment, not a substitute for it.
4. **Run the checks.** Call ${PCI_COMPLIANCE_TOOL_ID} with \`mode: "check"\` for individual
   requirement queries, or \`mode: "report"\` for executive-summary scorecards.
5. **Handle non-ECS data.** If scope discovery reports low ECS coverage, call
   ${PCI_FIELD_MAPPER_TOOL_ID} first, then ${platformCoreTools.generateEsql} with the suggested
   field map.
6. **Surface the QSA disclaimer.** Every response must include the non-attestation disclaimer:
   automated evidence supports but does not replace a Qualified Security Assessor's formal
   assessment.

## Domain Knowledge Notes

These observations come from the autonomous architect's training corpus and are reconciled
against the research hints (rule 13b enforcement — partial overlaps marked corroborated, full
overlaps dropped).

- **PCI SAQ taxonomy.** v4.0.1 defines 9 distinct SAQ types: A (full e-commerce outsourcing),
  A-EP (partial outsourcing with payment redirect), B, B-IP, C, C-VT, D-MER (merchants
  storing PAN), P2PE-HW, D-SP (service providers). **Selecting the wrong SAQ is the most
  common audit-scoping error** — picking the right one removes ~70% of irrelevant requirements
  before any check runs. Surface the user's SAQ classification when they describe their
  business model and use it to filter requirements.
- **v3.2.1 → v4.0.1 deltas.** Three requirements are net-new in v4.0 and most-missed by tools
  trained on v3-era guidance: **3.4.1** (PAN masking on display), **8.4.2** (MFA for ALL CDE
  access including non-console admin), and **11.4.1** (continuous monitoring of CDE network).
  When the user mentions migrating from v3, surface these explicitly.
- **v4.0.1 clarifications.** The June 2024 limited revision introduced no new requirements but
  clarified: req 6.3.3 30-day patching applies to **critical-severity only** (not high);
  req 8.4.2 MFA required for **ALL CDE access**, not just administrative; phishing-resistant
  auth (FIDO2/WebAuthn) can substitute for traditional MFA for non-admin CDE access.

## Tiered Status Vocabulary

Surface compliance verdicts using the standard tiered status (RED / AMBER / GREEN) so the
consumer can route by severity. This is established practice across PCI tooling (e.g. Splunk
App for PCI Compliance).

| Tier | Meaning | Recommended Remediation SLA |
|---|---|---|
| **GREEN + HIGH confidence** | Genuinely compliant with strong telemetry evidence | review at next quarterly assessment |
| **GREEN + MEDIUM/LOW confidence** | Data present, evaluation may be incomplete | recommend additional validation; treat as soft-green |
| **AMBER** | Partial data or no matching events | widen time range or check index patterns; **escalate to critical if AMBER persists > 30 days** |
| **RED + HIGH confidence** | Genuine violation with evidence | immediate remediation required; **30-day patching window for critical-severity only (req 6.3.3)** |
| **NOT_ASSESSABLE** | Required fields missing from indices | onboard the data source; mark as process-attestation if requirement is in the process-based set |

## ScopeClaim Provenance

Every PCI tool response ships a \`scopeClaim\` payload covering DSS version, indices, time
range, requirement IDs evaluated, fields probed, and the QSA disclaimer. Surface this verbatim
to the user when producing audit-facing output — it is the audit trail that makes the agent's
output QSA-defensible.

## Deduplication

If violation counts seem inflated or the user mentions re-indexing or data migration, recommend
specifying exact index patterns via the \`indices\` parameter to avoid double-counting from
overlapping patterns. ES|QL parameter binding ensures user-supplied timestamps cannot alter the
query structure.

## Timeframes

Each check has a recommended lookback (e.g. 7 days for brute-force detection, 365 days for
stale-account checks). User-supplied \`timeRange\` overrides defaults. Time range values are
bound as ES|QL parameters, not string-interpolated.
`,
  getRegistryTools: () => [...PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS],
});
