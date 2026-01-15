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
  time_range: z.string().optional().default('24h').describe('Time range to query (e.g., "24h", "7d"). Default: "24h"'),
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
      defaultMessage: 'Returns the count of unique hosts and users affected by a rule, along with a prevalence level (low, medium, high, very_high) and top affected hosts.',
    }),
    examples: [
      `## Get global prevalence
\`\`\`yaml
- name: get_prevalence
  type: security.getGlobalPrevalence
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
    time_range: "24h"
\`\`\``,
    ],
  },
};

