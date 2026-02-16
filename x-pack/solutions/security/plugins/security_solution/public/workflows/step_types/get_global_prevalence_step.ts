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
  ruleId: z.string().describe('The rule ID to check global prevalence for'),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO timestamp used as the end of the lookback window. If omitted, the current time (now) is used.'
    ),
  time_range: z
    .string()
    .optional()
    .default('24h')
    .describe(
      'Lookback window subtracted from the timestamp (e.g., "24h", "7d"). Prevalence is calculated from [timestamp - time_range] to [timestamp]. Default: "24h".'
    ),
});

const outputSchema = z.object({
  rule_id: z.string(),
  time_range: z.string(),
  total_alerts: z.number(),
  unique_hosts: z.number(),
  unique_users: z.number(),
  prevalence_level: z.enum(['low', 'medium', 'high', 'very_high']),
  top_hosts: z.array(
    z.object({
      host_name: z.string(),
      alert_count: z.number(),
    })
  ),
  message: z.string(),
});

export const getGlobalPrevalenceStepDefinition: PublicStepDefinition = {
  id: 'security.getGlobalPrevalence',
  inputSchema,
  outputSchema,
  label: i18n.translate('securitySolution.workflows.steps.getGlobalPrevalence.label', {
    defaultMessage: 'Get Global Prevalence',
  }),
  description: i18n.translate('securitySolution.workflows.steps.getGlobalPrevalence.description', {
    defaultMessage: 'Check if a rule is triggering across many hosts to determine prevalence level',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/globe').then(({ icon }) => ({ default: icon })).catch(() =>
      import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({ default: icon }))
    )
  ),
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.getGlobalPrevalence.documentation.details', {
      defaultMessage:
        'Returns the count of unique hosts and users affected by a rule, along with a prevalence level (low, medium, high, very_high) and top affected hosts. Prevalence is calculated over a lookback window of [timestamp - time_range, timestamp] (or [now - time_range, now] if timestamp is omitted).',
    }),
    examples: [
      `## Get global prevalence (last 24h from now)
\`\`\`yaml
- name: get_prevalence
  type: security.getGlobalPrevalence
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
    time_range: "24h"
\`\`\``,
      `## Get global prevalence looking back 1h from an alert timestamp
\`\`\`yaml
- name: get_prevalence_at_alert_time
  type: security.getGlobalPrevalence
  with:
    ruleId: "{{ event.rule.id }}"
    timestamp: "{{ event.@timestamp }}"
    time_range: "1h"
\`\`\``,
    ],
  },
};

