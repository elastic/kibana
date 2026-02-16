/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to get alert history for'),
  time_range: z.string().optional().default('7d').describe('Time range to query (e.g., "7d", "24h", "30d"). Default: "7d"'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  time_range: z.string(),
  total_alerts: z.number(),
  history: z.array(
    z.object({
      timestamp: z.string(),
      count: z.number(),
    })
  ),
  message: z.string(),
});

export const getAlertHistoryStepDefinition: PublicStepDefinition = {
  id: 'security.getAlertHistory',
  inputSchema,
  outputSchema,
  label: i18n.translate('securitySolution.workflows.steps.getAlertHistory.label', {
    defaultMessage: 'Get Alert History',
  }),
  description: i18n.translate('securitySolution.workflows.steps.getAlertHistory.description', {
    defaultMessage: 'Get historical trigger rates for a rule showing how often it fired over time',
  }),
  // Icon will default to 'kibana' if not provided
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.getAlertHistory.documentation.details', {
      defaultMessage: 'Returns a date histogram of alerts for the specified rule within the given time range.',
    }),
    examples: [
      `## Get alert history for a rule
\`\`\`yaml
- name: get_history
  type: security.getAlertHistory
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
    time_range: "7d"
\`\`\``,
    ],
  },
};

