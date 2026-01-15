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
  alertId: z.string().describe('The alert ID to find related alerts for'),
  alertIndex: z.string().describe('The alert index'),
  time_window: z.string().optional().default('1h').describe('Time window to search for related alerts (e.g., "1h", "24h"). Default: "1h"'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  time_window: z.string(),
  entity_info: z.object({
    host_name: z.string().optional(),
    user_name: z.string().optional(),
    service_name: z.string().optional(),
  }),
  related_alerts_count: z.number(),
  related_alerts: z.array(
    z.object({
      alert_id: z.string(),
      alert_index: z.string(),
      timestamp: z.string().optional(),
      rule_name: z.string().optional(),
      severity: z.string().optional(),
      related_by_entity_type: z.array(z.string()),
    })
  ),
  message: z.string(),
});

export const getRelatedAlertsStepDefinition: PublicStepDefinition = {
  id: 'security.getRelatedAlerts',
  inputSchema,
  outputSchema,
  label: i18n.translate('securitySolution.workflows.steps.getRelatedAlerts.label', {
    defaultMessage: 'Get Related Alerts',
  }),
  description: i18n.translate('securitySolution.workflows.steps.getRelatedAlerts.description', {
    defaultMessage: 'Find other alerts on the same host, user, or service entity within a time window',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/link').then(({ icon }) => ({ default: icon })).catch(() =>
      import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({ default: icon }))
    )
  ),
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.getRelatedAlerts.documentation.details', {
      defaultMessage: 'Searches for alerts that share the same host, user, or service entity as the specified alert within the given time window.',
    }),
    examples: [
      `## Get related alerts
\`\`\`yaml
- name: get_related
  type: security.getRelatedAlerts
  with:
    alertId: "{{ variables.alert_id }}"
    alertIndex: "{{ variables.alert_index }}"
    time_window: "1h"
\`\`\``,
    ],
  },
};

