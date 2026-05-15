/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

const DEFAULT_TIME_WINDOW_HOURS = 24;
const DEFAULT_MAX_RESULTS = 25;

export const getRelatedAlertsInputSchema = z.object({
  alertId: z.string().describe('The _id of the alert to find related alerts for'),
  alertIndex: z
    .string()
    .describe(
      'The alerts index pattern to search (e.g. ".alerts-security.alerts-default"). In Agent Builder this is derived from the active space.'
    ),
  timeWindowHours: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .max(168)
    .optional()
    .default(DEFAULT_TIME_WINDOW_HOURS)
    .describe('Time window in hours to search for related alerts (1-168, default 24)'),
  maxResults: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(DEFAULT_MAX_RESULTS)
    .describe('Maximum number of related alerts to return (1-100, default 25)'),
  hostNames: z
    .array(z.string())
    .optional()
    .describe(
      'Optional: host.name values from the alert. If provided along with other entity arrays, skips refetching the alert.'
    ),
  userNames: z
    .array(z.string())
    .optional()
    .describe(
      'Optional: user.name values from the alert. If provided along with other entity arrays, skips refetching the alert.'
    ),
  sourceIps: z.array(z.string()).optional().describe('Optional: source.ip values from the alert.'),
  destIps: z
    .array(z.string())
    .optional()
    .describe('Optional: destination.ip values from the alert.'),
});

export const getRelatedAlertsOutputSchema = z.object({
  message: z.string(),
  sourceEntities: z.object({
    hostNames: z.array(z.string()),
    userNames: z.array(z.string()),
    sourceIps: z.array(z.string()),
    destIps: z.array(z.string()),
  }),
  relatedAlerts: z.array(z.record(z.string(), z.unknown())),
  totalMatched: z.number(),
  returnedCount: z.number(),
  isTruncated: z.boolean(),
});

export const getRelatedAlertsStepCommonDefinition: BaseStepDefinition<
  typeof getRelatedAlertsInputSchema,
  typeof getRelatedAlertsOutputSchema
> = {
  id: 'security.alertAnalysis.getRelatedAlerts',
  label: i18n.translate('xpack.securitySolution.workflows.steps.getRelatedAlerts.label', {
    defaultMessage: 'Get Related Alerts',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getRelatedAlerts.description',
    {
      defaultMessage:
        'Find alerts that share entities (host.name, user.name, source.ip, destination.ip) with a given alert within a configurable time window. Returns matched alerts plus the source entities used for correlation. This is the workflow-step surface of the same `findRelatedAlerts` service exposed as an inline Agent Builder tool — a single TypeScript handler serves both consumers without duplication.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getRelatedAlertsInputSchema,
  outputSchema: getRelatedAlertsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getRelatedAlerts.documentation.details',
      {
        defaultMessage:
          'Correlates a seed alert with other alerts in the same alerts index that share at least one entity value (host.name, user.name, source.ip, destination.ip) and fall within the configured time window. ' +
          'If the caller has already extracted entity values, pass them via the hostNames/userNames/sourceIps/destIps arrays to skip the initial alert lookup. ' +
          'The handler is backed by the shared `findRelatedAlerts` service, which is also exposed as an inline Agent Builder tool (security.alert-analysis.get-related-alerts). This is the dual-register pattern: same code, two surfaces — agents and workflows — without duplication.',
      }
    ),
    examples: [
      `## Find related alerts for a seed alert
\`\`\`yaml
- name: correlate_alert
  type: security.alertAnalysis.getRelatedAlerts
  with:
    alertId: "{{ variables.alert_id }}"
    alertIndex: "{{ variables.alert_index }}"
    timeWindowHours: 24
    maxResults: 25
\`\`\``,
      `## Skip the alert lookup when entities are already known
\`\`\`yaml
- name: correlate_alert
  type: security.alertAnalysis.getRelatedAlerts
  with:
    alertId: "{{ variables.alert_id }}"
    alertIndex: ".alerts-security.alerts-default"
    timeWindowHours: 48
    hostNames: ["WIN-SRV01"]
    userNames: ["alice"]
\`\`\``,
    ],
  },
};
