/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const ALERTS_SEARCH_STEP_TYPE_ID = 'security.alertsSearch';

export const AlertsSearchInputSchema = z.object({
  query: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Elasticsearch query DSL to filter alerts. Defaults to match_all.'),
  size: z
    .number()
    .optional()
    .describe('Maximum number of alert hits to return. Defaults to 0 (count only).'),
  sort: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Sort criteria for the returned alerts.'),
  index: z
    .string()
    .optional()
    .describe('Override the alerts index pattern. Defaults to .alerts-security.alerts-<space_id>.'),
});

export const AlertsSearchOutputSchema = z.object({
  total: z.number().describe('Total number of alerts matching the query.'),
  hits: z
    .array(z.record(z.string(), z.unknown()))
    .describe('Array of matching alert documents (_source).'),
});

export type AlertsSearchInput = z.infer<typeof AlertsSearchInputSchema>;
export type AlertsSearchOutput = z.infer<typeof AlertsSearchOutputSchema>;

export const alertsSearchStepCommonDefinition: CommonStepDefinition<
  typeof AlertsSearchInputSchema,
  typeof AlertsSearchOutputSchema
> = {
  id: ALERTS_SEARCH_STEP_TYPE_ID,
  category: StepCategory.KibanaSecurity,
  label: i18n.translate('xpack.securitySolution.workflows.alertsSearchStep.label', {
    defaultMessage: 'Search Security Alerts',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.alertsSearchStep.description', {
    defaultMessage:
      'Searches and counts security alerts from the detection engine alerts index using Elasticsearch query DSL.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.alertsSearchStep.documentation.details',
      {
        defaultMessage:
          'The security.alertsSearch step queries the .alerts-security.alerts index for the current Kibana space. It returns the total count and optionally the alert documents themselves. Use the query input to filter by severity, rule name, status, or any alert field. When size is 0 (default), only the count is returned.',
      }
    ),
    examples: [
      `## Count all open alerts
\`\`\`yaml
- name: count_alerts
  type: ${ALERTS_SEARCH_STEP_TYPE_ID}
  with:
    query:
      bool:
        filter:
          - term:
              kibana.alert.workflow_status: open
\`\`\``,

      `## Search critical alerts with results
\`\`\`yaml
- name: search_critical
  type: ${ALERTS_SEARCH_STEP_TYPE_ID}
  with:
    size: 10
    query:
      bool:
        filter:
          - term:
              kibana.alert.severity: critical
    sort:
      - "@timestamp":
          order: desc
\`\`\``,
    ],
  },
  inputSchema: AlertsSearchInputSchema,
  outputSchema: AlertsSearchOutputSchema,
};
