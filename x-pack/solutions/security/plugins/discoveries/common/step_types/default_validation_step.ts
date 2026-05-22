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

import { AnonymizedAlertSchema, ApiConfigSchema, AttackDiscoverySchema } from './shared_schemas';

/**
 * Step type ID for the default validation step.
 */
export const DefaultValidationStepTypeId = 'security.attack-discovery.defaultValidation';

/**
 * Input schema for Default Validation step.
 */
export const DefaultValidationInputSchema = z.object({
  alerts_context_count: z.number().int().optional(),
  alerts_index_pattern: z.string().optional().default('.alerts-security.alerts-*'),
  anonymized_alerts: z.array(AnonymizedAlertSchema).optional(),
  api_config: ApiConfigSchema,
  attack_discoveries: z.array(AttackDiscoverySchema),
  connector_name: z.string().optional(),
  enable_field_rendering: z.boolean().optional().default(true),
  generation_uuid: z.string(),
  replacements: z.record(z.string(), z.string()).optional(),
  with_replacements: z.boolean().optional().default(false),
});

/**
 * Output schema for Default Validation step.
 */
export const DefaultValidationOutputSchema = z.object({
  filter_reason: z.string().optional(),
  filtered_count: z.number().int(),
  validated_discoveries: z.array(z.unknown()),
});

/**
 * Common step definition for Default Validation step.
 * This step performs hallucination detection and deduplication on generated Attack Discoveries.
 * Shared between server and public implementations.
 */
export const DefaultValidationStepCommonDefinition: CommonStepDefinition<
  typeof DefaultValidationInputSchema,
  typeof DefaultValidationOutputSchema
> = {
  category: StepCategory.Kibana,
  description: i18n.translate('xpack.discoveries.workflowSteps.defaultValidation.description', {
    defaultMessage:
      'Detect hallucinated alert references and deduplicate generated Attack Discoveries',
  }),
  id: DefaultValidationStepTypeId,
  inputSchema: DefaultValidationInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.defaultValidation.label', {
    defaultMessage: 'Attack Discovery: Validation',
  }),
  outputSchema: DefaultValidationOutputSchema,
};
