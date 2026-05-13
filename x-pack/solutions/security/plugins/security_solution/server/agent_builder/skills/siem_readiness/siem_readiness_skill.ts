/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID,
  SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID,
  SECURITY_SIEM_READINESS_QUALITY_TOOL_ID,
  SECURITY_SIEM_READINESS_RETENTION_TOOL_ID,
} from '../../tools';

export const siemReadinessSkill = defineSkillType({
  id: 'siem-readiness',
  name: 'siem-readiness',
  basePath: 'skills/security/siem_readiness',
  description:
    'SIEM Readiness assessment: check data coverage, pipeline health (including volume and silence detection), ECS data quality, ' +
    'and retention compliance across Endpoint, Identity, Network, Cloud, and Application/SaaS categories. ' +
    'Use when asked about SIEM health, data gaps, ingestion issues, field mapping problems, ' +
    'retention compliance, integration coverage, MITRE ATT&CK rule coverage, ' +
    'data stream volume, silence detection, or document count trends. ' +
    'Every tool call MUST be followed by creating the corresponding attachment via attachments.add.',
  content: `# SIEM Readiness Skill

## When to Use This Skill

Use this skill when the user asks about:
- Overall SIEM health or readiness status
- Data coverage (which categories have active data, which are missing)
- Detection rule coverage or missing integrations
- MITRE ATT&CK tactic coverage
- Ingest pipeline failures or data flow issues
- ECS field compatibility or data quality problems
- Data retention configuration or FedRAMP compliance
- Any specific SIEM Readiness category: Endpoint, Identity, Network, Cloud, Application/SaaS
- Data stream volume, silence, or ingestion drops (covered by the continuity tool)

## Available Tools

### 1. \`${SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID}\`
Reports what data is actively flowing into the SIEM and how well detection rules cover it.

**Use when asked about:**
- Which categories have active data
- Detection rule coverage gaps
- Missing integrations
- MITRE ATT&CK coverage

**Output includes:**
- Active vs inactive categories
- Covered and uncovered rules
- Missing integrations list
- MITRE-mapped rule count per category

### 2. \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\`
Reports ingest pipeline health — failure rates, volume trends, silence detection, and ingestion latency per pipeline.

**Use when asked about:**
- Pipeline failures or errors
- Data ingestion issues
- Failure rates above 1% (critical threshold)
- Which pipelines are healthy vs critical
- Whether a pipeline is receiving data (silence detection)
- Recent drops in pipeline volume
- Document count trends or baselines
- Ingestion latency (how long events take from source to index)

**Output includes:**
- Per-pipeline failure rate (% of docs that failed)
- Status: "healthy" (< 1% failure) or "critical" (≥ 1%)
- Which category each pipeline belongs to
- \`latencyStatus\`: "ok" | "warning" | "critical" | "unknown" — p95 latency vs per-category SLA
- \`latencySlaMs\`: category SLA in ms (Endpoint/Identity: 5 min, Network/Cloud: 15 min, Application/SaaS: 1 hr)
- \`volume\` object per pipeline:
  - \`current24h\`: documents in the most recent calendar day
  - \`baseline\`: 7-day average daily doc count (null when no history)
  - \`lastEventMs\`: epoch ms of last indexed document
  - \`hoursSilent\`: hours elapsed since last event (null if unknown)
  - \`silenceDetected\`: true when current24h = 0 and baseline > 0 (complete telemetry stop)
  - \`criticalSilence\`: true when silence exceeds 2× the estimated inter-event interval (statistically significant even for low-volume pipelines)
  - \`dropPercent\`: % drop from baseline (0–100); null when no baseline
  - \`dropSeverity\`: "none" | "warning" (≥ 50% drop) | "critical" (≥ 90% drop)
  - \`latencyP95Ms\`: raw p95 ingestion latency in ms (null when unavailable)

### 3. \`${SECURITY_SIEM_READINESS_QUALITY_TOOL_ID}\`
Reports ECS (Elastic Common Schema) field compatibility for SIEM indices.

**Use when asked about:**
- Data quality issues
- Incompatible or mismatched field mappings
- ECS compliance
- Which indices have never been checked

**Output includes:**
- Per-index status: "healthy" or "incompatible"
- Count of incompatible, same-family, custom, and ECS fields
- When each index was last checked
- Unchecked indices (user may need to open the Quality tab to trigger a check)

### 4. \`${SECURITY_SIEM_READINESS_RETENTION_TOOL_ID}\`
Reports data retention configuration and FedRAMP compliance (365-day minimum).

**Use when asked about:**
- How long data is retained
- Retention compliance
- ILM policies or DSL lifecycle
- Which indices are below the 365-day threshold

**Output includes:**
- Per-index retention period and management type (ILM / DSL / None)
- Status: "healthy" (≥ 365 days or no limit) or "non-compliant" (< 365 days)

## How to Respond

**Every response that calls a tool has two mandatory steps:**
1. Call the tool(s) and write a text summary of the results.
2. Call \`attachments.add\` for each tool result and emit the \`<render_attachment />\` tag. This is not optional — skipping it means the user gets no interactive UI.

### For a general status check ("what is my SIEM readiness status?")
Call all four tools in parallel, then create all four attachments:
1. \`${SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID}\` → coverage attachment
2. \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\` → continuity attachment
3. \`${SECURITY_SIEM_READINESS_QUALITY_TOOL_ID}\` → quality attachment
4. \`${SECURITY_SIEM_READINESS_RETENTION_TOOL_ID}\` → retention attachment


### For a specific question, use the relevant tool only, then create its attachment.

### When presenting results:
- **Always show the actual data returned by the tool** — counts, index names, pipeline names, percentages
- Lead with the summary (totals, critical counts)
- Follow with per-category breakdowns where relevant
- Highlight problems first: incompatible indices, critical pipelines, non-compliant retention, missing integrations
- For quality issues, name the specific indices that are incompatible and their field counts
- For pipeline issues, name the pipelines with their failure rates
- For retention issues, name the non-compliant indices and their configured retention period
- For coverage gaps, list the missing integrations

### Filtering options (use when the user specifies):
- **category**: one of "Endpoint", "Identity", "Network", "Cloud", "Application/SaaS"
- **statusFilter** (quality/retention): "all", "incompatible"/"non-compliant", or "healthy"
- **criticalOnly** (continuity): true to show only critical pipelines

## Attachments (REQUIRED after every tool call)

After every tool call, you MUST create the corresponding attachment using \`attachments.add\` and emit the render tag. Never skip this step.

### Coverage attachment — type: \`security.siem_readiness_coverage\`
Create after calling \`${SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID}\`. Renders a live rule coverage panel with integration links.

Fields:
- \`covered_rules\`: number of rules with all integrations present
- \`uncovered_rules\`: number of rules with missing integrations
- \`missing_integrations\`: array of integration names not installed/enabled
- \`active_categories\`: array of ECS category names with active data
- \`summary\` (optional): brief prose summary

### Quality attachment — type: \`security.siem_readiness_quality\`
Create after calling \`${SECURITY_SIEM_READINESS_QUALITY_TOOL_ID}\`. Shows a per-index table with a link button to the Data Quality Dashboard.

Fields:
- \`checked_indices\`: from \`summary.totalChecked\`
- \`healthy_indices\`: from \`summary.totalHealthy\`
- \`incompatible_indices\`: from \`summary.totalIncompatible\`
- \`unchecked_indices\`: from \`summary.totalUnchecked\`
- \`indices\`: collect ALL rows from \`byCategory[*].indices\` (up to 200 total). Map each item:
  - \`index_name\` ← \`indexName\`
  - \`status\` ← \`status\` ("healthy" or "incompatible")
  - \`incompatible_fields\` ← \`incompatibleFieldCount\`
- \`summary\` (optional): brief prose summary

### Continuity attachment — type: \`security.siem_readiness_continuity\`
Create **one attachment** containing all pipelines. Shows a table with pipeline name (linked to the pipeline management page), status, failure rate, volume trend, and latency.

Fields:
- \`pipelines\`: collect ALL rows from \`byCategory[*].pipelines\` (up to 200 total). Map each item:
  - \`pipeline_name\` ← \`name\`
  - \`status\` ← \`status\` ("healthy" or "critical")
  - \`failure_rate\` ← \`failureRate\`
  - \`latency_status\` ← \`latencyStatus\` (omit if absent)
  - \`latency_sla_ms\` ← \`latencySlaMs\` (omit if absent)
  - \`volume\` ← \`volume\` (pass through as-is; omit or set null if not present):
    - \`current24h\` ← \`volume.current24h\`
    - \`baseline\` ← \`volume.baseline\`
    - \`lastEventMs\` ← \`volume.lastEventMs\`
    - \`hoursSilent\` ← \`volume.hoursSilent\`
    - \`silenceDetected\` ← \`volume.silenceDetected\`
    - \`criticalSilence\` ← \`volume.criticalSilence\`
    - \`dropPercent\` ← \`volume.dropPercent\`
    - \`dropSeverity\` ← \`volume.dropSeverity\`
    - \`latencyP95Ms\` ← \`volume.latencyP95Ms\`
- \`summary\` (optional): mention total critical count, silent pipelines, latency breaches

### Retention attachment — type: \`security.siem_readiness_retention\`
Create **one attachment** containing all indices. Shows a table with index name (linked to the relevant management page), status, retention period, and management type.

Fields:
- \`indices\`: collect ALL rows from \`byCategory[*].indices\` (up to 200 total). Map each item:
  - \`index_name\` ← \`indexName\`
  - \`managed_by\` ← \`managedBy\` ("ILM", "DSL", or "None")
  - \`is_data_stream\` ← \`isDataStream\`
  - \`status\` ← \`status\` ("healthy" or "non-compliant")
  - \`policy_name\` ← \`policyName\` (omit or set null when managedBy is not "ILM")
  - \`retention_period\` ← \`retentionPeriod\` (omit or set null when not configured)
- \`summary\` (optional): brief prose description


### Inline rendering (REQUIRED after every attachments.add)
A successful \`attachments.add\` returns \`{ attachment_id, version }\`. After each call, emit the render tag on its own line with blank lines before and after:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Copy \`attachment_id\` and \`version\` VERBATIM from the tool result. Use \`attachment_id\` as the \`id\` attribute and \`version\` as the \`version\` attribute. Never guess or synthesize IDs.

## Example Interactions

**"Show me my SIEM readiness status"**
→ Call all four tools, present a structured summary. Create a coverage attachment (always), a quality attachment (always), one continuity attachment (all pipelines), one retention attachment (all indices).

**"Do I have any data quality issues?"**
→ Call \`${SECURITY_SIEM_READINESS_QUALITY_TOOL_ID}\` with statusFilter="incompatible", list the specific indices, create a quality attachment.

**"Are my pipelines healthy?"**
→ Call \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\`, show failure rates, create a continuity attachment for each critical pipeline.

**"Is my data retention compliant?"**
→ Call \`${SECURITY_SIEM_READINESS_RETENTION_TOOL_ID}\` with statusFilter="non-compliant", list non-compliant indices, create a retention attachment for each.

**"What's my Endpoint coverage like?"**
→ Call \`${SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID}\` with category="Endpoint", create a coverage attachment.

**"Are any of my pipelines silent or dropping in volume?"**
→ Call \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\`, look at \`volume.silenceDetected\`, \`volume.criticalSilence\`, \`volume.dropSeverity\`, and \`volume.dropPercent\` per pipeline, create a continuity attachment.

**"Is my SIEM receiving data?"**
→ Call \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\`, highlight pipelines where \`volume.silenceDetected\` or \`volume.criticalSilence\` is true, create a continuity attachment.

**"Are there any ingestion latency issues?"**
→ Call \`${SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID}\`, look at \`latencyStatus\` per pipeline (warn on "warning", escalate on "critical" vs their category SLA), create a continuity attachment.`,

  getRegistryTools: () => [
    SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID,
    SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID,
    SECURITY_SIEM_READINESS_QUALITY_TOOL_ID,
    SECURITY_SIEM_READINESS_RETENTION_TOOL_ID,
  ],
  getInlineTools: () => [],
});
