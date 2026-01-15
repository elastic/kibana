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
  time_range: z.string().optional().default('1h').describe('Time range to query (e.g., "1h", "24h", "7d"). Default: "1h"'),
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
  label: i18n.translate('securitySolution.workflows.steps.getRuleFireCount.label', {
    defaultMessage: 'Get Rule Fire Count',
  }),
  description: i18n.translate('securitySolution.workflows.steps.getRuleFireCount.description', {
    defaultMessage: 'Get the count of how many times a rule fired within a specified time range',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/stats').then(({ icon }) => ({ default: icon })).catch(() =>
      import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({ default: icon }))
    )
  ),
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.getRuleFireCount.documentation.details', {
      defaultMessage: 'Returns the total number of times a rule fired within the specified time range.',
    }),
    examples: [
      `## Get rule fire count
\`\`\`yaml
- name: get_fire_count
  type: security.getRuleFireCount
  with:
    ruleId: "{{ event.alerts[0].kibana.alert.rule.rule_id }}"
    time_range: "24h"
\`\`\``,
    ],
  },
};

