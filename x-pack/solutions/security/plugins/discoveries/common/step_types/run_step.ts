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
 * All fields are optional. When `connector_id` is omitted, the server resolves
 * `feature_id` if given, then the configured default AI connector
 * (`genAiSettings:defaultAIConnector`, with an `inference.getDefaultConnector`
 * fallback). Provide `connector_id` to override both.
 */
export const RunStepInputSchema = z.object({
  additional_context: z.string().optional(),
  alert_retrieval_mode: z
    .enum(['custom_only', 'custom_query', 'esql', 'provided'])
    .optional()
    .default('custom_query'),
  alert_retrieval_workflow_ids: z.array(z.string()).optional().default([]),
  alerts: z.array(z.string()).optional(),
  connector_id: z.string().optional(),
  end: z.string().optional(),
  esql_query: z.string().optional(),
  /**
   * Model Management > Feature settings feature id whose configured model this
   * run should use. Lets a caller pick a tier without naming an endpoint, so a
   * leaf step can state its own tier rather than having a `connector_id`
   * threaded down to it through `workflow.execute` inputs.
   *
   * Consulted only when `connector_id` is omitted, and skipped when the id is
   * not a registered `chat_completion` feature — resolution then continues to
   * the configured default, which is what happens when the plugin owning the
   * feature is disabled.
   */
  feature_id: z.string().max(256).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  /**
   * Whether the generated discoveries are returned inline. Defaults to `true`.
   *
   * Set `false` when the caller will read the persisted discoveries back from
   * the Attack Discovery index instead (they are queryable by
   * `kibana.alert.rule.execution.uuid`, which is this step's `execution_uuid`).
   * The discoveries dominate this step's output, so omitting them keeps it small
   * enough to stay in the workflow engine's in-memory step state, which matters
   * for callers that read the output from a `parallel` branch.
   */
  include_attack_discoveries: z.boolean().optional().default(true),
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
 *
 * `status` distinguishes a terminal run (`completed`) from one that is still
 * executing in the background (`pending`). Only async mode returns `pending`,
 * so consumers of that mode poll `security.attack-discovery.get_status` instead
 * of reading the absent counts as "0 discoveries". Sync mode awaits the pipeline
 * to completion and always returns `completed`, bounded by the step's `timeout`.
 */
export const RunStepOutputSchema = z.object({
  alerts_context_count: z.number().int().optional(),
  attack_discoveries: z.array(AttackDiscoverySchema).nullable().optional(),
  discovery_count: z.number().int().optional(),
  execution_uuid: z.string(),
  status: z.enum(['pending', 'completed']),
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
