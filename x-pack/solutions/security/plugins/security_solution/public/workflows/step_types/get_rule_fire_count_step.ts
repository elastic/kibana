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
  ruleId: z.string().describe('The rule ID to get fire count for'),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO timestamp used as the end of the lookback window. If omitted, the current time (now) is used.'
    ),
  time_range: z
    .string()
    .optional()
    .default('1h')
    .describe(
      'Lookback window subtracted from the timestamp (e.g., "1h", "24h", "7d"). Fire count is calculated from [timestamp - time_range] to [timestamp]. Default: "1h"'
    ),
});

const outputSchema = z.object({
  rule_id: z.string(),
  count: z.number(),
  time_range: z.string(),
  message: z.string(),
});

export const getRuleFireCountStepDefinition: PublicStepDefinition = {
  id: 'security.getRuleFireCount',
  inputSchema,
  outputSchema,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getRuleFireCount.label', {
    defaultMessage: 'Get Rule Fire Count',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getRuleFireCount.description',
    {
      defaultMessage: 'Get the count of how many times a rule fired within a specified time range',
    }
  ),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/stats')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getRuleFireCount.documentation.details',
      {
        defaultMessage:
          'Returns the total number of times a rule fired within the lookback window [timestamp - time_range, timestamp] (or [now - time_range, now] if timestamp is omitted).',
      }
    ),
    examples: [
      `## Get rule fire count (last 24h from now)
\`\`\`yaml
- name: get_fire_count
  type: security.getRuleFireCount
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
    time_range: "24h"
\`\`\``,
      `## Get rule fire count looking back 1h from an alert timestamp
\`\`\`yaml
- name: get_fire_count_at_alert_time
  type: security.getRuleFireCount
  with:
    ruleId: "{{ event.rule.id }}"
    timestamp: "{{ event.@timestamp }}"
    time_range: "1h"
\`\`\``,
    ],
  },
};
