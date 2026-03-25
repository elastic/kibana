/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  ALERT_DEDUPLICATION_TOOL_ID,
} from '../../tools/alert_deduplication_tool';
import {
  ENTITY_EXTRACTION_TOOL_ID,
} from '../../tools/entity_extraction_tool';
import {
  CASE_MATCHING_TOOL_ID,
} from '../../tools/case_matching_tool';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools/alerts_tool';
import { RUN_INVESTIGATION_PIPELINE_TOOL_ID } from '../../tools/run_investigation_pipeline_tool';

const skillContent = `
# Alert Investigation Pipeline Skill

This skill orchestrates a multi-step investigation of security alerts, combining deduplication,
entity extraction, case correlation, and risk assessment into a structured workflow.

## When to Use This Skill

Use this skill when:
- An analyst asks to "investigate these alerts" or "triage these alerts"
- Multiple related alerts need to be processed as a group
- An analyst wants to determine if alerts are duplicates, extract IOCs, and find related cases
- An analyst asks "what should I do with these alerts?"
- Building an investigation timeline from raw alerts
- An analyst asks to "run the pipeline", "process all open alerts", or "triage unreviewed alerts"

## Quick Mode: Run Full Pipeline

If the analyst wants to process ALL unprocessed alerts at once (not specific alert IDs), use
\`security.run_investigation_pipeline\` which runs the complete E2E pipeline in one call:

\`\`\`
security.run_investigation_pipeline({
  max_alerts: 100,        // How many alerts to process
  lookback_minutes: 15,   // How far back to look
  dry_run: true           // Preview without changes
})
\`\`\`

This fetches unprocessed alerts, deduplicates, extracts entities, and returns a full report.
Use this when the analyst says "run the pipeline" or "what alerts need attention?"

For investigating SPECIFIC alerts (by ID), use the step-by-step workflow below instead.

## Step-by-Step Workflow

Follow these steps IN ORDER for investigating specific alerts:

### Step 1: Fetch Alerts
Use \`security.alerts\` to retrieve the alerts the analyst wants to investigate.
- If alert IDs are provided, fetch those specific alerts
- If a natural language query is given, search for matching alerts
- Note the total count and severity distribution

### Step 2: Deduplicate
Use \`security.alert_deduplication\` to identify duplicate or near-duplicate alerts.
- Provide the alert IDs from Step 1
- Use default threshold (0.85) unless the analyst specifies otherwise
- Report: "Found X groups of duplicates out of Y total alerts"
- Recommend using only the representative (leader) alert from each group for further analysis

### Step 3: Extract Entities
Use \`security.entity_extraction\` to pull out all observables from the deduplicated alerts.
- Provide the leader alert IDs (not duplicates)
- Summarize entities by type: "Found 3 hosts, 5 IPs, 2 users, 1 file hash"
- Highlight any known-bad indicators if recognized

### Step 4: Find Related Cases
Use \`security.case_matching\` to check if these alerts belong to an existing investigation.
- Provide the same alert IDs used in Step 3
- If a match is found (score > 0.3): recommend attaching alerts to that case
- If no match: recommend creating a new case
- If ambiguous (multiple close matches): present options to the analyst

### Step 5: Risk Assessment
Use \`security.entity_risk_score\` or \`security.get_entity\` to check risk scores for key entities.
- Focus on hosts and users extracted in Step 3
- Flag any entities with risk score > 70 as "high risk"
- Note any recent risk score changes

### Step 6: Summarize and Recommend
Present a structured summary:

**Investigation Summary**
| Metric | Value |
|--------|-------|
| Total alerts | X |
| Duplicates found | Y |
| Unique alerts | Z |
| Entities extracted | N |
| Matching cases | M |

**Key Findings:**
- [Most significant entity or pattern]
- [Risk assessment highlights]
- [Related case recommendation]

**Recommended Actions:**
1. [Attach to case / Create new case]
2. [Investigate high-risk entities]
3. [Check threat intelligence for IOCs]

## Examples

### Example 1: Triage a batch of alerts

User: "I have 20 new alerts from the last hour. Can you triage them?"

Steps:
1. Use \`security.alerts\` to fetch recent alerts (last 1 hour)
2. Use \`security.alert_deduplication\` on all 20 alert IDs
3. Use \`security.entity_extraction\` on the unique (non-duplicate) alerts
4. Use \`security.case_matching\` to find related cases
5. Present structured summary with recommendations

### Example 2: Investigate specific alerts

User: "Are alerts abc123 and def456 related? Should they be in the same case?"

Steps:
1. Use \`security.alert_deduplication\` with [abc123, def456] to check similarity
2. Use \`security.entity_extraction\` on both alerts to compare entities
3. Use \`security.case_matching\` to check if either belongs to an existing case
4. Present comparison: shared entities, similarity score, case recommendation

### Example 3: Extract IOCs for threat hunting

User: "What IOCs can you extract from these 5 alerts?"

Steps:
1. Use \`security.entity_extraction\` with the 5 alert IDs
2. Focus output on threat-relevant entity types: IPs, domains, file hashes, URLs
3. Present in a format suitable for threat hunting (table with type + value)
4. Suggest checking these IOCs against threat intelligence

## Best Practices
- Always deduplicate BEFORE extracting entities (avoids counting entities from duplicate alerts)
- When matching cases, start with default threshold (0.3) and adjust if too many/few matches
- Risk scores above 70 warrant immediate attention
- If more than 50 alerts, suggest processing in batches of 50
- Always provide actionable next steps, not just data
- Use tables for structured output (easier to scan)
`;

export const getAlertInvestigationSkill = () =>
  defineSkillType({
    id: 'alert-investigation',
    name: 'alert-investigation',
    basePath: 'skills/security/alert-investigation',
    description:
      'Run the full Alert Investigation Pipeline or orchestrate individual investigation steps. ' +
      'Supports both quick mode (process all open alerts in one call) and step-by-step mode ' +
      '(deduplicate, extract entities, match cases individually). ' +
      'Use when an analyst wants to investigate, triage, run the pipeline, or process alerts.',
    content: skillContent,
    getInlineTools: () => [],
    getRegistryTools: () => [
      RUN_INVESTIGATION_PIPELINE_TOOL_ID,
      SECURITY_ALERTS_TOOL_ID,
      ALERT_DEDUPLICATION_TOOL_ID,
      ENTITY_EXTRACTION_TOOL_ID,
      CASE_MATCHING_TOOL_ID,
    ],
  });
