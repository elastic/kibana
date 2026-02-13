/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_LOGS_SKILL = defineSkillType({
  id: 'observability.logs',
  name: 'logs',
  basePath: 'skills/observability',
  description: 'Explore logs, categories/patterns, and correlations',
  content: `# Observability Logs

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Log data sources or log indices
- Log patterns or categories
- Log rate analysis or spikes
- Correlated logs

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing data sources:
- If sources found: "Found X log data sources:" then list names
- If none: "No log data sources found."

### When analyzing logs:
Show analysis results from tool: patterns, categories, rates.

## FORBIDDEN RESPONSES
- Do NOT explain what logs are
- Do NOT add information not in tool results

## Operations
- \`get_data_sources\`: Discover available log sources
- \`run_log_rate_analysis\`: Analyze log rates
- \`get_log_categories\`: Find log patterns
- \`get_correlated_logs\`: Find related logs
`,
  getAllowedTools: () => [
    'observability.get_index_info',
    'observability.run_log_rate_analysis',
    'observability.get_log_groups',
    'observability.get_correlated_logs',
  ],
});
