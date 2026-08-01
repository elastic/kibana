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
 * Step type ID for the Correlate Entities step.
 */
export const CorrelateEntitiesStepTypeId = 'security.attack-discovery.correlateEntities';

/**
 * Input schema for the Correlate Entities step.
 *
 * `attack_discoveries` is intentionally `z.array(z.unknown())` (like the
 * validation step's `validated_discoveries` output): enriched discovery
 * objects flow through the pipeline without stripping.
 */
export const CorrelateEntitiesInputSchema = z.object({
  alerts_index_pattern: z.string().optional(),
  attack_discoveries: z.array(z.unknown()),
});

/**
 * Output schema for the Correlate Entities step.
 */
export const CorrelateEntitiesOutputSchema = z.object({
  correlated_discoveries: z.array(z.unknown()),
  entities_matched_count: z.number().int(),
  observable_entities_count: z.number().int(),
});

/**
 * Common step definition for the Correlate Entities step.
 * This step is a best-effort enrichment: it aggregates the alerts behind each
 * discovery by EUID (user/host/service), looks the EUIDs up in the Entity
 * Store, and attaches `entities` (matched) and `observable_entities`
 * (unmatched values + extracted observables) to each discovery.
 * Shared between server and public implementations.
 */
export const CorrelateEntitiesStepCommonDefinition: CommonStepDefinition<
  typeof CorrelateEntitiesInputSchema,
  typeof CorrelateEntitiesOutputSchema
> = {
  category: StepCategory.Kibana,
  description: i18n.translate('xpack.discoveries.workflowSteps.correlateEntities.description', {
    defaultMessage:
      'Correlate Attack Discoveries with Entity Store entities and extract unmatched observables',
  }),
  id: CorrelateEntitiesStepTypeId,
  inputSchema: CorrelateEntitiesInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.correlateEntities.label', {
    defaultMessage: 'Attack Discovery: Correlate Entities',
  }),
  outputSchema: CorrelateEntitiesOutputSchema,
};
