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

import { AttackDiscoverySchema } from './shared_schemas';

/**
 * Step type ID for the run step.
 */
export const RunStepTypeId = 'security.attack-discovery.run';

/**
 * Input schema for the Run step.
 *
 * Only `connector_id` is required. All other fields are optional,
 * allowing workflow authors to invoke Attack Discovery with minimal
 * configuration.
 */
export const RunStepInputSchema = z.object({
  additional_context: z.string().optional(),
  alert_retrieval_mode: z
    .enum(['custom_only', 'custom_query', 'esql', 'provided'])
    .optional()
    .default('custom_query'),
  alert_retrieval_workflow_ids: z.array(z.string()).optional().default([]),
  alerts: z.array(z.string()).optional(),
  connector_id: z.string(),
  end: z.string().optional(),
  esql_query: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  mode: z.enum(['async', 'sync']).optional().default('sync'),
  size: z.number().int().optional().default(100),
  start: z.string().optional(),
  validation_workflow_id: z.string().optional().default(''),
});

/**
 * Output schema for the Run step (sync mode).
 *
 * Sync mode returns discoveries inline. Async mode returns only
 * `execution_uuid`. The `replacements` map is explicitly excluded
 * from both modes for security.
 */
export const RunStepOutputSchema = z.object({
  alerts_context_count: z.number().int().optional(),
  attack_discoveries: z.array(AttackDiscoverySchema).nullable().optional(),
  discovery_count: z.number().int().optional(),
  execution_uuid: z.string(),
});

/**
 * Common step definition for the Run step.
 * High-level entry point that orchestrates alert retrieval, generation,
 * and validation in a single step.
 */
export const RunStepCommonDefinition: CommonStepDefinition<
  typeof RunStepInputSchema,
  typeof RunStepOutputSchema
> = {
  category: StepCategory.Ai,
  description: i18n.translate('xpack.discoveries.workflowSteps.run.description', {
    defaultMessage:
      'Run the full Attack Discovery pipeline: retrieve alerts, generate discoveries, and validate results',
  }),
  id: RunStepTypeId,
  inputSchema: RunStepInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.run.label', {
    defaultMessage: 'Attack Discovery: Run',
  }),
  outputSchema: RunStepOutputSchema,
};
