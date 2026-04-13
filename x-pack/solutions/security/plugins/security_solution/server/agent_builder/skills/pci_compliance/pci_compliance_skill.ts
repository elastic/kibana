/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  PCI_COMPLIANCE_CHECK_TOOL_ID,
  PCI_COMPLIANCE_REPORT_TOOL_ID,
  PCI_FIELD_MAPPER_TOOL_ID,
  PCI_SCOPE_DISCOVERY_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';

const PCI_TOOL_IDS = [
  PCI_SCOPE_DISCOVERY_TOOL_ID,
  PCI_COMPLIANCE_CHECK_TOOL_ID,
  PCI_COMPLIANCE_REPORT_TOOL_ID,
  PCI_FIELD_MAPPER_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.cases,
  platformCoreTools.productDocumentation,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

export const pciComplianceSkill = defineSkillType({
  id: 'pci-compliance',
  name: 'pci-compliance',
  basePath: 'skills/security/compliance',
  description:
    'PCI DSS v4.0.1 compliance assessments with violation detection, confidence scoring, ' +
    'data quality preflight checks, and visual audit reporting. Use when the user asks about ' +
    'PCI compliance, PCI DSS requirements, compliance audits, or cardholder data security.',
  content: `# PCI DSS v4.0.1 Compliance Skill

## When to Use This Skill

Use this skill when:
- A user asks about PCI DSS compliance status, assessments, or audits
- A user wants to check specific PCI DSS requirements (e.g. "check requirement 8.3.4")
- A user asks about cardholder data security, payment card compliance, or PCI posture
- A user needs a compliance report with Red/Amber/Green status

Do **not** use this skill when:
- The user is asking about general security threats unrelated to PCI compliance
- The user needs threat hunting or attack investigation (use security alerts tools instead)

## Available Tools

- **${PCI_SCOPE_DISCOVERY_TOOL_ID}**: Discover PCI-relevant data coverage across indices
- **${PCI_COMPLIANCE_CHECK_TOOL_ID}**: Run compliance checks with violation detection and confidence scoring
- **${PCI_COMPLIANCE_REPORT_TOOL_ID}**: Generate compliance reports with visual scorecards
- **${PCI_FIELD_MAPPER_TOOL_ID}**: Map non-ECS fields to ECS equivalents for custom data sources
- **${platformCoreTools.generateEsql}**: Generate ES|QL queries for adapted compliance checks
- **${platformCoreTools.executeEsql}**: Execute ES|QL queries and return tabular results

## Compliance Assessment Workflow

1. **Discover available data** — call ${PCI_SCOPE_DISCOVERY_TOOL_ID} to identify indices and data coverage.
2. **Run compliance checks** — call ${PCI_COMPLIANCE_CHECK_TOOL_ID} for individual or full requirement assessments.
3. **Generate reports** — call ${PCI_COMPLIANCE_REPORT_TOOL_ID} for structured compliance reports with visual scorecards.
4. **Handle non-ECS data** — if scope discovery reports low ECS coverage, call ${PCI_FIELD_MAPPER_TOOL_ID} to discover field mappings, then use ${platformCoreTools.generateEsql} with those mappings.

## Interpreting Results

- **GREEN + HIGH confidence** = genuinely compliant with strong evidence
- **GREEN + MEDIUM/LOW confidence** = data present but evaluation may be incomplete; recommend additional validation
- **RED + HIGH confidence** = genuine violation detected with evidence; immediate remediation required
- **AMBER** = partial data or no matching events; widen time range or check index patterns
- **NOT_ASSESSABLE** = required fields missing from indices; data source may need onboarding

## Deduplication

If violation counts seem inflated or the user mentions re-indexing or data migration, recommend specifying exact index patterns via the indices parameter to avoid double-counting from overlapping patterns.

## Timeframes

Each check has a recommended lookback period (e.g. 7 days for brute-force, 365 days for stale accounts). User-provided timeRange overrides defaults.

## Requirements Outside SIEM Scope

Requirements 3 (stored data), 9 (physical access), and 12 (policies) are primarily process-based. Report available telemetry but always note that manual process verification is required for full compliance.

## PCI DSS Version

All checks reference PCI DSS v4.0.1 (published June 2024). v4.0 was retired December 31, 2024. Key v4.0.1 clarifications:
- Req 6.3.3: 30-day patching applies to critical-severity only (not high)
- Req 8.4.2: MFA required for ALL CDE access, not just administrative
- Phishing-resistant auth (FIDO2/WebAuthn) can substitute for traditional MFA for non-admin CDE access
`,
  getRegistryTools: () => PCI_TOOL_IDS,
});
