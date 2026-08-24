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

import { AnonymizedAlertSchema, ApiConfigSchema, ConfidenceSchema } from './shared_schemas';

/**
 * Step type ID for the generic confidence-scoring step. It scores an arbitrary
 * bundle of alerts — a set of related detection alerts, or the alerts cited by
 * an attack discovery — and returns ONE calibrated confidence for the bundle.
 * Confidence is computed OUTSIDE Attack Discovery generation and is not stored
 * on the attack discovery document.
 */
export const GenericConfidenceStepTypeId = 'security.confidence';

// Bound array/string inputs to prevent unbounded-input DoS.
const MAX_ALERTS = 1000;
const MAX_MARKDOWN = 50_000;

/**
 * Input schema for the generic confidence step.
 *
 * Accepts alerts in either shape (a caller supplies one, or both):
 * - `alerts`: raw ECS alert documents (e.g. an alert trigger's `event.alerts`,
 *   or the alerts fetched for an attack discovery's `alert_ids`). Fields may be
 *   nested (`event.category`) or already dotted.
 * - `anonymized_alerts`: the anonymized CSV form produced by Attack Discovery
 *   alert retrieval.
 *
 * `api_config` is optional — without a connector the step returns a
 * deterministic-only score. `context` carries optional narrative (e.g. an attack
 * discovery's title/summary) that sharpens the LLM synthesis;
 * `mitre_attack_tactics` is a tactic-NAME fallback used only when the alerts
 * carry no `threat.tactic.id`.
 */
export const GenericConfidenceStepInputSchema = z.object({
  alerts: z.array(z.record(z.string(), z.unknown())).max(MAX_ALERTS).optional(),
  anonymized_alerts: z.array(AnonymizedAlertSchema).max(MAX_ALERTS).optional(),
  api_config: ApiConfigSchema.optional(),
  connector_name: z.string().max(1_024).optional(),
  context: z
    .object({
      details_markdown: z.string().max(MAX_MARKDOWN).optional(),
      mitre_attack_tactics: z.array(z.string().max(200)).max(50).optional(),
      summary_markdown: z.string().max(MAX_MARKDOWN).optional(),
      title: z.string().max(1_000).optional(),
    })
    .optional(),
  execution_id: z.string().max(1_024).optional(),
});

/**
 * Output schema: ONE confidence per bundle plus the number of alerts scored.
 */
export const GenericConfidenceStepOutputSchema = z.object({
  alert_count: z.number().int(),
  confidence: ConfidenceSchema,
});

/**
 * Common step definition for the generic confidence step. Shared between server
 * and public.
 */
export const GenericConfidenceStepCommonDefinition: CommonStepDefinition<
  typeof GenericConfidenceStepInputSchema,
  typeof GenericConfidenceStepOutputSchema
> = {
  category: StepCategory.Ai,
  description: i18n.translate('xpack.discoveries.workflowSteps.genericConfidence.description', {
    defaultMessage:
      'Compute a calibrated confidence score (how sure a finding is real) for a bundle of detection alerts or an attack discovery',
  }),
  id: GenericConfidenceStepTypeId,
  inputSchema: GenericConfidenceStepInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.genericConfidence.label', {
    defaultMessage: 'Security: Confidence',
  }),
  outputSchema: GenericConfidenceStepOutputSchema,
};
