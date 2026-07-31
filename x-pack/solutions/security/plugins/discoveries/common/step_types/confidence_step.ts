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
 * Step type ID for the confidence-scoring step.
 */
export const ConfidenceStepTypeId = 'security.attack-discovery.confidence';

/**
 * Input schema for the confidence step.
 *
 * Reads only step inputs — no extra index privileges are required for the
 * deterministic factors, which are computed from the `anonymized_alerts` CSV
 * (joined to each discovery by `alert_ids`) plus the discovery fields.
 */
export const ConfidenceStepInputSchema = z.object({
  anonymized_alerts: z.array(AnonymizedAlertSchema).optional(),
  api_config: ApiConfigSchema,
  attack_discoveries: z.array(AttackDiscoverySchema),
  connector_name: z.string().optional(),
  generation_uuid: z.string(),
  replacements: z.record(z.string(), z.string()).optional(),
});

/**
 * Output schema for the confidence step.
 *
 * `attack_discoveries` is the SAME array that came in, each element annotated
 * in place with an optional `confidence` field (no separate `scored_discoveries`
 * shape). Typed as `unknown[]` because upstream steps enrich discoveries with
 * extra fields (connector_id, generation_uuid, replacements) that must survive.
 */
export const ConfidenceStepOutputSchema = z.object({
  attack_discoveries: z.array(z.unknown()),
  scored_count: z.number().int(),
});

/**
 * Common step definition for the confidence step. Computes a calibrated,
 * auditable confidence score for each validated Attack Discovery and annotates
 * it onto the discovery before persistence. Shared between server and public.
 */
export const ConfidenceStepCommonDefinition: CommonStepDefinition<
  typeof ConfidenceStepInputSchema,
  typeof ConfidenceStepOutputSchema
> = {
  category: StepCategory.Ai,
  description: i18n.translate('xpack.discoveries.workflowSteps.confidence.description', {
    defaultMessage:
      'Compute a calibrated confidence score (how sure a discovery is real) and annotate each Attack Discovery',
  }),
  id: ConfidenceStepTypeId,
  inputSchema: ConfidenceStepInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.confidence.label', {
    defaultMessage: 'Attack Discovery: Confidence',
  }),
  outputSchema: ConfidenceStepOutputSchema,
};
