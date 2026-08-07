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

import { AnonymizedAlertSchema, ApiConfigSchema } from './shared_schemas';

/**
 * Step type ID for the default alert retrieval step.
 */
export const DefaultAlertRetrievalStepTypeId = 'security.attack-discovery.defaultAlertRetrieval';

const AnonymizationFieldSchema = z.object({
  allowed: z.boolean().optional(),
  anonymized: z.boolean().optional(),
  field: z.string(),
  id: z.string(),
});

/**
 * Input schema for Default Alert Retrieval step.
 */
export const DefaultAlertRetrievalInputSchema = z.object({
  alerts_index_pattern: z.string(),
  anonymization_fields: z.array(AnonymizationFieldSchema),
  api_config: ApiConfigSchema,
  end: z.string().optional(),
  esql_query: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  replacements: z.record(z.string(), z.string()).optional(),
  size: z.number().int(),
  start: z.string().optional(),
});

/**
 * Output schema for Default Alert Retrieval step.
 */
export const DefaultAlertRetrievalOutputSchema = z.object({
  alerts: z.array(z.string()),
  alerts_context_count: z.number().int(),
  anonymized_alerts: z.array(AnonymizedAlertSchema).optional(),
  api_config: ApiConfigSchema,
  connector_name: z.string().optional(),
  replacements: z.record(z.string(), z.string()),
});

/**
 * Common step definition for Default Alert Retrieval step.
 * This step retrieves and anonymizes alerts for Attack Discovery generation.
 * Shared between server and public implementations.
 */
export const DefaultAlertRetrievalStepCommonDefinition: CommonStepDefinition<
  typeof DefaultAlertRetrievalInputSchema,
  typeof DefaultAlertRetrievalOutputSchema
> = {
  category: StepCategory.Elasticsearch,
  description: i18n.translate('xpack.discoveries.workflowSteps.defaultAlertRetrieval.description', {
    defaultMessage:
      'Retrieve and anonymize security alerts from Elasticsearch for Attack Discovery generation',
  }),
  id: DefaultAlertRetrievalStepTypeId,
  inputSchema: DefaultAlertRetrievalInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.defaultAlertRetrieval.label', {
    defaultMessage: 'Attack Discovery: Alert Retrieval',
  }),
  outputSchema: DefaultAlertRetrievalOutputSchema,
};
