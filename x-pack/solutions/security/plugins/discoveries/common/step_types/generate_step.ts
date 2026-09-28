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

import { ApiConfigSchema, AttackDiscoverySchema } from './shared_schemas';

/**
 * Step type ID for the generate step.
 */
export const GenerateStepTypeId = 'security.attack-discovery.generate';

/**
 * Input schema for Generate step.
 */
export const GenerateStepInputSchema = z.object({
  /**
   * Optional free-form text appended to the LLM generation prompt.
   * Provides extra context, constraints, or focus areas for the model.
   */
  additional_context: z.string().optional(),
  /**
   * Pre-retrieved alerts in a format compatible with the prompt
   */
  alerts: z.array(z.string()).min(1),
  /**
   * Connector configuration
   */
  api_config: ApiConfigSchema,
  /**
   * Anonymization replacements map
   */
  replacements: z.record(z.string(), z.string()).optional(),
  /**
   * Maximum number of discoveries to generate
   */
  size: z.number().int().optional().default(10),
});

/**
 * Output schema for Generate step.
 */
export const GenerateStepOutputSchema = z.object({
  /**
   * Generated attack discoveries (null if none generated)
   */
  attack_discoveries: z.array(AttackDiscoverySchema).nullable(),
  /**
   * Unique identifier for this generation execution
   */
  execution_uuid: z.string().uuid(),
  /**
   * Updated anonymization replacements map
   */
  replacements: z.record(z.string(), z.string()),
});

/**
 * Common step definition for Generate step.
 * This step generates attack discoveries from pre-retrieved alerts.
 * Shared between server and public implementations.
 */
export const GenerateStepCommonDefinition: CommonStepDefinition<
  typeof GenerateStepInputSchema,
  typeof GenerateStepOutputSchema
> = {
  category: StepCategory.Ai,
  description: i18n.translate('xpack.discoveries.workflowSteps.generate.description', {
    defaultMessage: 'Generate attack discoveries from alerts using AI analysis',
  }),
  id: GenerateStepTypeId,
  inputSchema: GenerateStepInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.generate.label', {
    defaultMessage: 'Attack Discovery: Generate',
  }),
  outputSchema: GenerateStepOutputSchema,
};
