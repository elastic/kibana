/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { parseArrayInput } from './workflow_schema_helpers';

export const TriggerIncrementalAdStepId = 'security.triggerIncrementalAd';

const TriggerAdInputSchema = z.object({
  case_id: z.string(),
  alert_ids: z.union([z.array(z.string()), z.string()]),
  min_new_alerts: z.number().default(2),
});

const TriggerAdOutputSchema = z.object({
  case_id: z.string(),
  triggered: z.boolean(),
  alert_count: z.number(),
  reason: z.string().optional(),
});

export const triggerIncrementalAdStep = createServerStepDefinition({
  id: TriggerIncrementalAdStepId,
  category: StepCategory.Kibana,
  label: 'Trigger Incremental Attack Discovery',
  description:
    'Triggers Attack Discovery for a case with new alerts. Designed to run inside forEach after case creation.',
  documentation: {
    details:
      'Receives a single case_id and its alert_ids. ' +
      'Only triggers AD when minimum threshold of new alerts is met (default: 2). ' +
      'In production, this would call the AD generation API. In the spike, it logs the trigger.',
    examples: [],
  },
  inputSchema: TriggerAdInputSchema,
  outputSchema: TriggerAdOutputSchema,
  handler: async (context) => {
    const { min_new_alerts } = context.input;
    const caseId = String(context.input.case_id);
    const alertIds = parseArrayInput(context.input.alert_ids);

    if (alertIds.length < min_new_alerts) {
      return {
        output: {
          case_id: caseId,
          triggered: false,
          alert_count: alertIds.length,
          reason: `Only ${alertIds.length} alerts, need at least ${min_new_alerts}`,
        },
      };
    }

    // In production: call AD generation API with case context
    // await generateAttackDiscoveries({ caseId, alertIds, ... })
    context.logger.info(
      `Triggered Attack Discovery for case ${caseId} with ${alertIds.length} alerts`
    );

    return {
      output: {
        case_id: caseId,
        triggered: true,
        alert_count: alertIds.length,
      },
    };
  },
});
