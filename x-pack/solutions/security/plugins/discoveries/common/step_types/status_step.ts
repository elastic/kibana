/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

/**
 * Step type ID for the Attack Discovery status step.
 */
export const StatusStepTypeId = 'security.attack-discovery.status';

/**
 * Input schema for the status step. Takes the `execution_uuid` returned by the
 * `security.attack-discovery.run` step (which returns early with
 * `status: 'pending'` once generation exceeds its soft deadline).
 */
export const StatusStepInputSchema = z.object({
  execution_uuid: z.string().min(1),
});

/**
 * Output schema for the status step.
 *
 * `attack_discoveries` is intentionally permissive (`unknown[]`) because it echoes
 * the persisted `AttackDiscoveryApiAlert` shape resolved from the validation
 * execution, which is richer than the generation-time discovery schema.
 */
export const StatusStepOutputSchema = z.object({
  attack_discoveries: z.array(z.unknown()).nullable(),
  discovery_count: z.number().int(),
  error_message: z.string().nullable(),
  execution_uuid: z.string(),
  phase: z.enum(['alert_retrieval', 'generation', 'validation']).nullable(),
  status: z.enum(['succeeded', 'running', 'failed', 'not_found']),
});

/**
 * Common step definition for the status step. Shared between server and public
 * implementations.
 */
export const StatusStepCommonDefinition: CommonStepDefinition<
  typeof StatusStepInputSchema,
  typeof StatusStepOutputSchema
> = {
  category: StepCategory.Kibana,
  description: i18n.translate('xpack.discoveries.workflowSteps.status.description', {
    defaultMessage:
      'Look up an Attack Discovery generation by execution_uuid and, once complete, return its persisted discoveries',
  }),
  id: StatusStepTypeId,
  inputSchema: StatusStepInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.status.label', {
    defaultMessage: 'Attack Discovery: Status',
  }),
  outputSchema: StatusStepOutputSchema,
};
