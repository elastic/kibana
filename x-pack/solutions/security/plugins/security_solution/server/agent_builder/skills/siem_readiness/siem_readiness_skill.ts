/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIEM_READINESS_COVERAGE_TOOL_ID,
  SIEM_READINESS_QUALITY_TOOL_ID,
  SIEM_READINESS_CONTINUITY_TOOL_ID,
  SIEM_READINESS_RETENTION_TOOL_ID,
} from '../../tools/siem_readiness';

export const siemReadinessSkill = defineSkillType({
  id: 'siem-readiness',
  name: 'siem-readiness',
  basePath: 'skills/security/siem_readiness',
  description:
    'SIEM readiness health assessment across four dimensions: Coverage (data ingested per category), Quality (ECS field compatibility), Continuity (ingest pipeline health), and Retention (data retention compliance). ' +
    'Use when the user asks about SIEM health, readiness, data coverage, pipeline failures, ECS quality, or retention compliance.',
  content: `
# SIEM Readiness Guide

## When to Use This Skill

Use this skill when the user asks about:
- Overall SIEM health or readiness status
- Data coverage — which categories (Endpoint, Identity, Network, Cloud, Application/SaaS) have data flowing in
- Data quality — whether indices comply with the ECS (Elastic Common Schema)
- Pipeline continuity — whether ingest pipelines are processing documents without failures
- Data retention — whether data is retained long enough to meet compliance requirements (e.g., FedRAMP 365-day threshold)

## Available Tools

- \`security.siem_readiness.get_coverage\` — ingested data by category + detection rule presence
- \`security.siem_readiness.get_quality\` — ECS field compatibility results per index
- \`security.siem_readiness.get_continuity\` — ingest pipeline stats (docs processed, failure rate, serving indices)
- \`security.siem_readiness.get_retention\` — retention policy per data stream / index, days, and compliance status

## Response Structure

Every SIEM readiness response MUST follow this four-section structure:

### 1. Status
Overall verdict derived from the worst status across all queried dimensions.
- \`healthy\` — all checked dimensions are healthy
- \`actionsRequired\` — at least one dimension needs attention
- \`noData\` — no data available to assess

One short line. Example: **Status: actionsRequired**

### 2. Summary
1–2 sentence narrative of what's going on. Mention which dimensions are healthy and which need attention, calling out specific categories where relevant.

Example: "Endpoint and Identity pipelines are healthy. Network has a critical failure rate and Cloud has no ingested data."

### 3. Findings by Dimension, then by Category

Organize findings with this outer-to-inner order:
1. **Coverage** — missing data categories, no detection rules
2. **Quality** — indices with incompatible ECS fields
3. **Continuity** — pipelines with critical failure rates
4. **Retention** — indices below the retention threshold

Within each dimension, group findings by category (Endpoint → Identity → Network → Cloud → Application/SaaS). Skip categories with no findings — do not pad with "no issues" lines.

Each finding must cite the specific resource (index name, pipeline name, data stream name).

Example:
\`\`\`
**Coverage**
- Cloud: no data ingested

**Continuity**
- Endpoint: pipeline \`logs-endpoint.events-default\` has 12% failure rate (critical)

**Retention**
- Network: \`logs-network.dns-default\` retention is 30d, below 365d threshold
\`\`\`

### 4. Suggested Actions

Concrete next steps, prioritized by severity (critical first). Each action references the dimension, category, and specific resource.

Playbook guidance:
- **Pipeline failure rate (Continuity / critical)**: Check the pipeline's \`on_failure\` processors in Stack Management > Ingest Pipelines. Look for recent index template changes or malformed documents. Common causes: field type conflicts, script processor errors.
- **Missing data (Coverage / warning)**: Verify the Elastic Agent policy for that category is deployed and healthy. Check Fleet > Agents for enrollment issues.
- **ECS incompatibility (Quality / warning)**: Review the index template mappings. Use the Data Quality dashboard to see exactly which fields are mismatched. Consider updating integration versions.
- **Retention below threshold (Retention / warning)**: Update the ILM policy or DSL lifecycle to extend the delete phase minimum age to at least 365d. For cloud-managed (serverless) environments, update the data stream retention setting.
- **No detection rules (Coverage / warning)**: Navigate to Security > Rules and enable rules relevant to the ingested data categories.

## Investigation Steps

### For "What is my SIEM readiness?" or similar broad questions:
1. Call all four tools in parallel: \`get_coverage\`, \`get_quality\`, \`get_continuity\`, \`get_retention\`
2. Derive overall status from the worst of the four dimension statuses
3. Produce the four-section response

### For dimension-specific questions (e.g., "How is my pipeline health?"):
1. Call only the relevant tool(s)
2. Still produce the four-section structure — sections for uncalled dimensions should note they were not evaluated for this query

### For category-specific questions (e.g., "How is my Endpoint data?"):
1. Call the relevant tools
2. In the Findings section, focus on the Endpoint category but still show other categories if they have findings

## Tool Output Fields

### Coverage (\`get_coverage\`)
- \`status\`: \`healthy | actionsRequired | noData\`
- \`summary\`: pre-computed summary string
- \`items\`: array of \`CategoryGroup\` — \`{ category, indices: [{ indexName, docs }] }\`
- \`actionableFindings\`: array of \`{ category, severity, message, resource }\`

### Quality (\`get_quality\`)
- \`status\`: \`healthy | actionsRequired | noData\`
- \`summary\`: pre-computed summary string
- \`items\`: array of \`DataQualityResultDocument\` — includes \`indexName\`, \`incompatibleFieldCount\`, \`incompatibleFieldMappingItems\`, \`incompatibleFieldValueItems\`, \`ecsFieldCount\`, \`totalFieldCount\`
- \`actionableFindings\`: array of \`{ category, severity, message, resource }\`

### Continuity (\`get_continuity\`)
- \`status\`: \`healthy | actionsRequired | noData\`
- \`summary\`: pre-computed summary string
- \`items\`: array of \`PipelineStats\` — \`{ name, indices, docsCount, failedDocsCount, statsAvailable }\`
  - \`statsAvailable: false\` in serverless mode — report pipelines as present but note stats are unavailable
- \`actionableFindings\`: array of \`{ category, severity, message, resource }\`
- Failure rate = \`failedDocsCount / docsCount * 100\`. A rate ≥ 1% is critical.

### Retention (\`get_retention\`)
- \`status\`: \`healthy | actionsRequired | noData\`
- \`summary\`: pre-computed summary string
- \`items\`: array of \`RetentionInfo\` — \`{ indexName, isDataStream, retentionType (ilm|dsl|null), retentionPeriod, retentionDays, policyName, status (healthy|non-compliant) }\`
- \`actionableFindings\`: array of \`{ category, severity, message, resource }\`
- Threshold: 365 days (FedRAMP). \`retentionDays: null\` means no explicit retention — data kept forever — which is compliant.

## Best Practices
- Always call \`actionableFindings\` arrays first to build the Suggested Actions section — they are pre-computed from the data.
- When \`statsAvailable\` is false (serverless), note this in the Continuity findings rather than reporting zero failures.
- In serverless environments, ILM is not available — retention is DSL-only for data streams; no standalone indices.
- Do not report "no issues" for every category — only call out categories with actual findings.
- Do not re-list raw arrays of indices in prose — reference the specific problematic resources from \`actionableFindings\`.
`,
  getRegistryTools: () => [
    SIEM_READINESS_COVERAGE_TOOL_ID,
    SIEM_READINESS_QUALITY_TOOL_ID,
    SIEM_READINESS_CONTINUITY_TOOL_ID,
    SIEM_READINESS_RETENTION_TOOL_ID,
  ],
});
