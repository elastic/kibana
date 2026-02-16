/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID'),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO timestamp used as the end of the lookback window. If omitted, the current time (now) is used.'
    ),
  time_range: z
    .string()
    .optional()
    .default('30d')
    .describe(
      'Lookback window subtracted from the timestamp (e.g., "30d", "90d", "7d"). Close history is calculated from [timestamp - time_range] to [timestamp]. Default: "30d"'
    ),
  match_alert_entities: z
    .object({
      alertId: z.string().describe('The alert ID (required when match_alert_entities is provided)'),
      alertIndex: z
        .string()
        .describe('The alert index (required when match_alert_entities is provided)'),
    })
    .optional()
    .describe(
      'The alert entities to match. When provided, only returns closed alerts on the same host/user/entity. When omitted, returns all closed alerts for the same rule.'
    ),
});

const outputSchema = z.object({
  alert_id: z.string(),
  rule_id: z.string(),
  time_range: z.string(),
  match_entities: z.boolean(),
  match_type: z.string(),
  entity_info: z
    .object({
      host_name: z.string().optional(),
      user_name: z.string().optional(),
      service_name: z.string().optional(),
    })
    .optional(),
  total_closed_alerts: z.number(),
  false_positive_count: z.number(),
  close_reasons_summary: z.record(z.string(), z.number()),
  closed_alerts: z.array(
    z.object({
      alert_id: z.string(),
      alert_index: z.string(),
      timestamp: z.string().optional(),
      rule_name: z.string().optional(),
      severity: z.string().optional(),
      close_reason: z.string(),
      workflow_tags: z.array(z.string()),
      status_updated_at: z.string().optional(),
      host_name: z.string().optional(),
      user_name: z.string().optional(),
      service_name: z.string().optional(),
    })
  ),
  message: z.string(),
});

export const getCloseHistoryStepDefinition: PublicStepDefinition = {
  id: 'security.getCloseHistory',
  inputSchema,
  outputSchema,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getCloseHistory.label', {
    defaultMessage: 'Get Close History',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getCloseHistory.description',
    {
      defaultMessage:
        'Get previous close reasons and false positive designations for similar alerts',
    }
  ),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getCloseHistory.documentation.details',
      {
        defaultMessage:
          'Returns historical close information for alerts matching the same rule (and optionally the same entities) to help understand how similar alerts were handled.',
      }
    ),
    examples: [
      `## Get close history for same rule (last 30d from now)
\`\`\`yaml
- name: get_close_history
  type: security.getCloseHistory
  with:
    ruleId: "{{ variables.rule_id }}"
    time_range: "30d"
\`\`\``,
      `## Get close history looking back 30d from an alert timestamp
\`\`\`yaml
- name: get_close_history_at_alert_time
  type: security.getCloseHistory
  with:
    ruleId: "{{ variables.rule_id }}"
    timestamp: "{{ event.@timestamp }}"
    time_range: "30d"
\`\`\``,
      `## Get close history for same rule and entities
\`\`\`yaml
- name: get_close_history_entities
  type: security.getCloseHistory
  with:
    ruleId: "{{ variables.rule_id }}"
    time_range: "30d"
    match_alert_entities:
      alertId: "{{ variables.alert_id }}"
      alertIndex: "{{ variables.alert_index }}"
\`\`\``,
    ],
  },
};
