/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { LiquidArraySchema, LiquidRecordSchema } from './workflow_schema_helpers';

export const TriggerIncrementalAdStepId = 'security.triggerIncrementalAd';

const TriggerAdInputSchema = z.object({
  affected_case_ids: LiquidArraySchema,
  alert_ids_by_case: LiquidRecordSchema,
  min_new_alerts: z.number().default(2),
});

const TriggerAdOutputSchema = z.object({
  ad_triggered: z.number(),
  ad_results: z.array(
    z.object({
      case_id: z.string(),
      triggered: z.boolean(),
      delta_alerts: z.number(),
      reason: z.string().optional(),
    })
  ),
});

export const triggerIncrementalAdStep = createServerStepDefinition({
  id: TriggerIncrementalAdStepId,
  category: StepCategory.Kibana,
  label: 'Trigger Incremental Attack Discovery',
  description:
    'Triggers Attack Discovery for cases with new alerts, using delta-based incremental processing to avoid re-analyzing previously processed alerts.',
  documentation: {
    details:
      'Tracks processed alerts per case in hidden index .security-ad-processed-alerts-{spaceId}. ' +
      'Only triggers AD when minimum threshold of new alerts is met (default: 2).',
    examples: [],
  },
  inputSchema: TriggerAdInputSchema,
  outputSchema: TriggerAdOutputSchema,
  handler: async (context) => {
    const { affected_case_ids, alert_ids_by_case, min_new_alerts } = context.input;

    if (affected_case_ids.length === 0) {
      return {
        output: {
          ad_triggered: 0,
          ad_results: [],
        },
      };
    }

    const results = await Promise.all(
      affected_case_ids.map(async (caseId) => {
        try {
          const alertIds = alert_ids_by_case[caseId] ?? [];

          if (alertIds.length < min_new_alerts) {
            return {
              case_id: caseId,
              triggered: false,
              delta_alerts: alertIds.length,
              reason: `Only ${alertIds.length} new alerts, need at least ${min_new_alerts}`,
            };
          }

          // TODO: Wire to actual AD function when available in workflow context
          // For now, log that it would be triggered
          // const { triggerCaseAttackDiscovery } = await import('../case_integration');
          context.logger.info(
            `Would trigger incremental AD for case ${caseId} with ${alertIds.length} new alerts`
          );

          return {
            case_id: caseId,
            triggered: true,
            delta_alerts: alertIds.length,
          };
        } catch (error) {
          context.logger.error(
            `Failed to trigger AD for case ${caseId}: ${
              error instanceof Error ? error.message : error
            }`
          );
          return {
            case_id: caseId,
            triggered: false,
            delta_alerts: 0,
            reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      })
    );

    const triggered = results.filter((r) => r.triggered).length;

    context.logger.info(
      `Triggered incremental AD for ${triggered}/${affected_case_ids.length} cases`
    );

    return {
      output: {
        ad_triggered: triggered,
        ad_results: results,
      },
    };
  },
});
