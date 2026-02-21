/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getSpaceHealthTool,
  generateInsightTool,
  GET_SPACE_HEALTH_TOOL_ID,
  GENERATE_INSIGHT_TOOL_ID,
} from './tools';
import type { SkillDependencies } from './types';
import { SKILL_ID } from './constants';

const NAME = 'detection-engine-rule-execution-troubleshooting';
const BASE_PATH = 'skills/security/alerts/rules';

export function createDeSpaceRulesExecutionTroubleshootingSkill(
  deps: SkillDependencies
): SkillDefinition<typeof NAME, typeof BASE_PATH> {
  const systemInstructions = `# Detection Engine Space Rules Execution Troubleshooting

This skill diagnoses and resolves issues with Detection Engine rule execution across all rules in the current Kibana space. It uses the Detection Engine Space Health API to retrieve aggregated health data.

## When to Use This Skill

Use this skill when:
- A user wants an overview of Detection Engine health in the current space
- A user reports widespread rule failures, warnings, or partial failures
- A user asks about rule execution performance, gaps, or scheduling delays across the space
- A user wants to identify the most common rule execution errors or warnings
- A user asks "why are my rules failing?" or "are there execution gaps?"
- A user wants to compare rule execution trends over time

## Troubleshooting Tools

- **${GET_SPACE_HEALTH_TOOL_ID}** - Fetch aggregated health data for all detection rules in the current space via the Detection Engine Space Health API. Returns rule counts, execution outcome breakdown, performance percentiles, top errors/warnings, gap detection, and time-bucketed history.
- **${platformCoreTools.search}** - Query raw data from Elasticsearch indices for deeper investigation when the space health overview reveals issues requiring drill-down.
- **${platformCoreTools.getDocumentById}** - Retrieve full document content by ID from search results.
- **${platformCoreTools.productDocumentation}** - Look up Elastic product documentation for detection rule configuration, known issues, and troubleshooting guidance.
- **${GENERATE_INSIGHT_TOOL_ID}** - Persist structured troubleshooting findings (mandatory final step).

## Troubleshooting Approach

### Step 1: Retrieve Space Health Overview

Call **${GET_SPACE_HEALTH_TOOL_ID}** with appropriate parameters:
- Use \`intervalType: "last_day"\` with \`granularity: "hour"\` for recent issues (default)
- Use \`intervalType: "last_week"\` with \`granularity: "day"\` for trend analysis
- Use \`intervalType: "last_hour"\` with \`granularity: "minute"\` for active/ongoing incidents

### Step 2: Analyze the Health Data

Examine the response systematically:

**a) Rule inventory (state_at_the_moment.number_of_rules)**
- Check total enabled vs disabled rules
- Review the \`by_outcome\` breakdown: rules with "failed" or "warning" last outcomes are problematic
- Check \`by_origin\` to see if issues are concentrated in prebuilt vs custom rules
- Check \`by_type\` to see if a specific rule type is disproportionately affected

**b) Execution outcomes (stats_over_interval.number_of_executions)**
- Calculate failure rate: \`failed / total * 100\`
- Calculate warning rate: \`warning / total * 100\`
- A failure rate above 5% warrants investigation
- A warning rate above 20% suggests widespread partial failure issues

**c) Top errors and warnings (stats_over_interval.top_errors, top_warnings)**
- These reveal the most common failure patterns across all rules
- Group issues by root cause (e.g., mapping conflicts, permissions, timeouts)
- Cross-reference with product documentation for known resolutions

**d) Performance metrics (stats_over_interval.*_duration_ms, schedule_delay_ms)**
- \`execution_duration_ms.percentiles["95.0"]\` > 60000 indicates slow rules
- \`schedule_delay_ms.percentiles["95.0"]\` > 30000 indicates overloaded task manager
- \`search_duration_ms\` vs \`indexing_duration_ms\` reveals whether slowness is in querying or alerting

**e) Execution gaps (stats_over_interval.number_of_detected_gaps)**
- Any gaps indicate periods where rules were not executing
- \`total_duration_s\` shows the cumulative gap time — long gaps mean detection blind spots

**f) Trend analysis (history_over_interval.buckets)**
- Look for deteriorating patterns: increasing failure counts, growing execution times
- Identify when issues started by comparing bucket stats chronologically
- Correlate spikes with known changes (deployments, index growth, etc.)

### Step 3: Investigate Deeper (if needed)

If the space health data reveals specific issues, use ${platformCoreTools.search} to drill into:
- \`.kibana-event-log-*\` for detailed execution events of specific failing rules
- \`.alerts-security.alerts-*\` to verify alert generation

Use ${platformCoreTools.productDocumentation} to look up:
- Known issues related to the top error messages
- Configuration guidance for the affected rule types
- Performance tuning recommendations

### Step 4: Persist Findings

Call **${GENERATE_INSIGHT_TOOL_ID}** with:
- A summary of the overall space health state
- Identified issues with severity assessments and remediation steps
- Key metrics extracted from the health data
- Supporting raw data

## Severity Assessment Guidelines

- **critical**: >20% failure rate, multiple rules completely non-functional, large execution gaps (>1h)
- **high**: 5-20% failure rate, degrading performance trends, frequent scheduling delays (p95 > 60s)
- **medium**: <5% failure rate but consistent, elevated warning rate, moderate performance concerns
- **low**: Isolated warnings, minor performance variations, optimization opportunities
- **info**: Space is healthy, all rules executing successfully, normal performance

## Edge Cases

- **No rules in the space**: Report that no detection rules are configured. Suggest creating rules or checking the correct space.
- **All rules disabled**: Report the count of disabled rules. Ask if this is intentional or if rules should be re-enabled.
- **Healthy space (no issues)**: Report the space as healthy with key metrics. Highlight any optimization opportunities (e.g., rules that could benefit from adjusted intervals).
- **Mixed issues across rule types**: Group findings by rule type and provide targeted remediation for each group.

## Constraints

- Base all conclusions on actual data from the Space Health API, not assumptions
- When investigating further with ${platformCoreTools.search}, only query \`.kibana-event-log-*\` and \`.alerts-security.alerts-*\` indices
- Keep query result sets small to stay within context limits
- **Always call ${GENERATE_INSIGHT_TOOL_ID}** to persist findings — this is mandatory and must not be skipped`;

  return defineSkillType({
    id: SKILL_ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'Troubleshoot Detection Engine rule execution issues across all rules in the current space using the Space Health API',
    content: systemInstructions,
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.getDocumentById,
      platformCoreTools.productDocumentation,
    ],
    getInlineTools: () => [getSpaceHealthTool(deps), generateInsightTool()],
  });
}
