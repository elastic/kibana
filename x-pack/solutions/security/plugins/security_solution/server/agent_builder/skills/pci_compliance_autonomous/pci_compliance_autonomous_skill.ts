/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
  PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID,
  PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
  PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
} from '../../tools';

/**
 * Registry-scoped tool IDs advertised by the autonomous PCI compliance skill.
 *
 * These are a fully **independent** tool set from the hand-written
 * `pci-compliance` skill. The autonomous variant does not reference, depend
 * on, or know about the hand-written variant's `core.security.pci_compliance`
 * / `pci_scope_discovery` / `pci_field_mapper` tool IDs.
 *
 * The bundle separates "compliance check" (per-requirement findings with
 * ES|QL evidence) from "scorecard report" (executive roll-up) as two narrow
 * tools rather than one mode-parameterised tool. The two are designed to be
 * called as a sequence: scorecard first for posture, then check on any
 * RED/AMBER requirements that need actionable evidence.
 */
export const PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS = [
  PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
  PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
  PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
  PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
] as const;

export const PCI_COMPLIANCE_AUTONOMOUS_SKILL_ID = 'pci-compliance-autonomous';

/**
 * PCI DSS v4.0.1 Compliance — autonomously architected variant.
 *
 * The sister skill `pci-compliance` (hand-written) ships its own, separate
 * tool IDs (`pci_scope_discovery` / `pci_compliance` / `pci_field_mapper`).
 * The autonomous variant here intentionally does NOT share or reference those
 * tool IDs — that isolation is the core property under test in the
 * side-by-side eval comparison at
 * `x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance` (set
 * `EVAL_PCI_VARIANT=autonomous` to evaluate this variant).
 *
 * Authoring/provenance metadata for this skill (autonomous research traces,
 * gate scores, citation classes) lives alongside the eval suite, not in this
 * runtime file. Comments here describe the agent-facing contract only.
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
  content: `# PCI DSS v4.0.1 Compliance Skill

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

- The user is asking about general security threats unrelated to PCI compliance.
- The user needs threat hunting or attack investigation (use security alerts tools instead).
- The user is asking about SOC 2, HIPAA, GDPR, NIST, ISO 27001, or other non-PCI compliance
  frameworks — defer to a more appropriate skill rather than answering here, to prevent
  activation drift.

## Available Tools

- **${PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID}** — Inventory PCI-relevant indices and classify
  them by scope area (network, identity, endpoint, cloud, application, vulnerability).
  Returns a \`discoveryClaim\` (point-in-time inventory snapshot) plus a \`dataGaps\` array
  surfacing any cluster errors that limited inventory completeness. Call this first to anchor
  every subsequent check.
- **${PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID}** — Run a PCI DSS v4.0.1 compliance CHECK for
  one or more requirements. Returns per-requirement findings (RED / AMBER / GREEN /
  NOT_ASSESSABLE) with ES|QL evidence and a \`scopeClaim\`. Use this when the user wants
  actionable findings on specific requirements.
- **${PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID}** — Produce a PCI DSS v4.0.1 posture SCORECARD
  rolling up RED/AMBER/GREEN/NOT_ASSESSABLE verdicts across all 12 requirements with a
  confidence-weighted overall score (0-100). Use this when the user wants an executive
  posture snapshot. Returns a \`scopeClaim\` and an \`overallStatus\` derived from the same
  severity-based rollup the compliance-check tool uses, so the two tools cannot disagree
  on posture.
- **${PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID}** — Inspect non-ECS fields and suggest ECS mappings
  when scope discovery reports low ECS coverage (e.g. \`username\` → \`user.name\`, \`src_ip\`
  → \`source.ip\`, \`cve\` → \`vulnerability.id\`).
- **${platformCoreTools.generateEsql}** — Generate ES|QL queries for adapted compliance checks
  when mapped fields differ from ECS.
- **${platformCoreTools.executeEsql}** — Execute ES|QL queries against discovered data.

## Compliance Assessment Workflow

**Always call the dedicated PCI tools** (\`${PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID}\`,
\`${PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID}\`, \`${PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID}\`,
\`${PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID}\`). Do **not** improvise raw ES|QL queries against
PCI indices when one of these tools applies. The tools encode requirement-specific detection
logic (default-account patterns, weak-TLS regex sets, brute-force thresholds, field-mapping
heuristics) that ad-hoc ES|QL will miss.

The recommended order is **discover → roll up → drill down**:

1. **Discover available data.** Call \`${PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID}\` to identify
   indices and data coverage. Inspect the \`discoveryClaim\` and \`dataGaps\` in the response —
   if \`dataGaps\` is non-empty, the inventory is incomplete and downstream verdicts should be
   reported with that caveat.
2. **Match the question to the next tool. The check and scorecard tools are designed to be
   used as a sequence, not as an either/or:**
   - If the user asks "what is our PCI posture?" or "are we compliant?", call
     \`${PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID}\` with \`format: "summary"\` (default),
     \`"detailed"\`, or \`"executive"\`. The scorecard ships an \`overallStatus\` (severity-
     based — any RED ⇒ overall RED), an \`overallScore\` (numeric 0-100 metric), and per-
     requirement rows. Use this for executive snapshots.
   - If the user asks about a specific requirement OR the scorecard surfaced one or more
     RED / AMBER rows that need actionable evidence, call
     \`${PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID}\` with the requirement IDs from the scorecard
     (e.g. \`["8.3.4"]\` or \`["2.2.4", "10.2.1"]\`). The findings include ES|QL evidence
     rows; surface them verbatim as audit evidence.
   - Calling both for the same posture is fine and often optimal: scorecard for the
     headline, then check for the drill-down. They share the same evaluator under the hood,
     so the per-requirement verdicts will match.
3. **Handle non-ECS data.** If \`${PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID}\` reports low ECS
   coverage on an index, call \`${PCI_AUTONOMOUS_FIELD_MAPPER_TOOL_ID}\` to discover field
   mappings, then use \`${platformCoreTools.generateEsql}\` with those mappings.
4. **Surface the QSA disclaimer** in every audit-facing response: automated evidence supports
   but does not replace a Qualified Security Assessor's formal assessment.

## Tiered Status Vocabulary

Surface compliance verdicts using the standard tiered status (RED / AMBER / GREEN /
NOT_ASSESSABLE) so the consumer can route by severity. The "Recommended Remediation SLA"
column below is **operational guidance**, not normative PCI DSS text — only the req 6.3.3
30-day patching window is sourced directly from the v4.0.1 spec; the rest are remediation
defaults a QSA would typically agree with but which an organisation may tune.

| Tier | Meaning | Recommended Remediation SLA (operational guidance) |
|---|---|---|
| **GREEN + HIGH confidence** | Genuinely compliant with strong telemetry evidence | review at next quarterly assessment |
| **GREEN + MEDIUM/LOW confidence** | Data present, evaluation may be incomplete | recommend additional validation; treat as soft-green |
| **AMBER** | Partial data or no matching events | widen time range or check index patterns; escalate if AMBER persists > 30 days |
| **RED + HIGH confidence** | Genuine violation with evidence | immediate remediation required; **30-day patching window for critical-severity only (req 6.3.3, per spec)** |
| **NOT_ASSESSABLE** | Required fields missing from indices | onboard the data source; mark as process-attestation if requirement is in the process-based set |

## ScopeClaim and DiscoveryClaim Provenance

Every compliance-check and scorecard response ships a \`scopeClaim\` payload covering DSS
version, indices, time range, requirement IDs evaluated, fields probed, and the QSA
disclaimer. The scope-discovery response ships a \`discoveryClaim\` instead — same
provenance/disclaimer block but with point-in-time \`discoveredAt\` semantics rather than a
time-range window. Surface the relevant claim verbatim to the user when producing audit-
facing output; it is the audit trail that makes the agent's output QSA-defensible.

## Deduplication

If violation counts seem inflated or the user mentions re-indexing or data migration, recommend
specifying exact index patterns via the \`indices\` parameter to avoid double-counting from
overlapping patterns. ES|QL parameter binding ensures user-supplied timestamps cannot alter the
query structure.

## Timeframes

Each check has a recommended lookback (e.g. 7 days for brute-force detection, 365 days for
stale-account checks). User-supplied \`timeRange\` overrides defaults. Time range values are
bound as ES|QL parameters, not string-interpolated.

## Background reference

The notes below are domain context. **Do not consult them before calling the tools** — the
tools encode the same knowledge operationally. Use this section only when you need to explain
a finding back to the user.

- **PCI SAQ taxonomy.** v4.0.1 defines 9 distinct SAQ types: A (full e-commerce outsourcing),
  A-EP (partial outsourcing with payment redirect), B, B-IP, C, C-VT, D-MER (merchants
  storing PAN), P2PE-HW, D-SP (service providers). Picking the right SAQ removes a large
  fraction of irrelevant requirements before any check runs (assessor guidance commonly
  cites figures in the 50–80% range; treat as a heuristic, not a guarantee). Surface the
  user's SAQ classification when they describe their business model and use it to filter
  requirements.
- **v3.2.1 → v4.0.1 deltas.** Three requirements are net-new in v4.0 and most-missed by tools
  trained on v3-era guidance: **3.4.1** (PAN masking on display), **8.4.2** (MFA for ALL CDE
  access including non-console admin), and **11.4.1** (continuous monitoring of CDE network).
  When the user mentions migrating from v3, surface these explicitly.
- **v4.0.1 clarifications.** The June 2024 limited revision introduced no new requirements but
  clarified: req 6.3.3 30-day patching applies to **critical-severity only** (not high);
  req 8.4.2 MFA required for **ALL CDE access**, not just administrative; phishing-resistant
  auth (FIDO2/WebAuthn) can substitute for traditional MFA for non-admin CDE access.
- **Scope-reduction levers** (in priority order): **tokenisation** (removes PAN entirely),
  **P2PE** (removes PAN from the merchant environment), **network segmentation** (reduces
  in-scope systems).
- **Requirement classification.** Technical requirements (1, 2, 4, 6, 7, 8, 10, 11) are
  verifiable from telemetry; process-based requirements (3, 5, 9, 12) require human
  attestation. \`${PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID}\` and
  \`${PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID}\` handle this distinction internally — surface
  the verdict they return rather than redoing the classification.
`,
  getRegistryTools: () => [...PCI_COMPLIANCE_AUTONOMOUS_SKILL_TOOL_IDS],
});
