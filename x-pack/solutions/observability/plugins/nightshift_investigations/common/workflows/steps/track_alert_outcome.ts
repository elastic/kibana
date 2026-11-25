/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod/v4';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';

export const TrackAlertOutcomeStepId = 'nightshift.alertOutcomes.track' as const;

export const TRACK_SKIP_REASONS = [
  'disabled',
  'follow_up',
  'local_alert_subject',
  'already_tracked',
  'no_round',
  'model_unavailable',
  'failed',
] as const;
export type TrackSkipReason = (typeof TRACK_SKIP_REASONS)[number];

export const trackAlertOutcomeStepInputSchema = lazySchema(() =>
  z.object({
    investigation_id: z.string().min(1).max(1024).describe('The investigation to track'),
    investigation_started_at: z
      .string()
      .max(100)
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a date')
      .describe('When this investigation run started'),
    follow_up: z
      .string()
      .max(100)
      .optional()
      .describe('The kind of follow-up this run is; empty for a first round'),
    is_follow_up: z.boolean().optional().describe('Whether this run continues a thread'),
    automation_id: z.string().max(512).optional().describe('The automation that started the run'),
    connector_id: z
      .string()
      .max(500)
      .optional()
      .describe("The round's model, used to extract the alert identity"),
  })
);

export const trackAlertOutcomeStepOutputSchema = lazySchema(() =>
  z.object({
    state: z
      .enum(['tracking', 'untrackable'])
      .optional()
      .describe('The tracking record this run wrote'),
    reason: z.string().optional().describe('Why the alert is untrackable'),
    source: z.string().optional().describe('The alert source the extractor detected'),
    skip_reason: z.enum(TRACK_SKIP_REASONS).optional().describe('Why nothing was recorded'),
  })
);

export const trackAlertOutcomeStepCommonDefinition: BaseStepDefinition<
  typeof trackAlertOutcomeStepInputSchema,
  typeof trackAlertOutcomeStepOutputSchema
> = {
  id: TrackAlertOutcomeStepId,
  label: i18n.translate('xpack.nightshiftInvestigations.steps.trackAlertOutcome.label', {
    defaultMessage: 'Track the Outcome of an External Alert',
  }),
  category: StepCategory.Ai,
  description: i18n.translate(
    'xpack.nightshiftInvestigations.steps.trackAlertOutcome.description',
    {
      defaultMessage:
        "Identifies the alert behind an investigation that did not start from an alert on this cluster, verifies it against the alert's source, and records it so its recovery queues a recovery round. Runs once per investigation and never fails the run.",
    }
  ),
  inputSchema: trackAlertOutcomeStepInputSchema,
  outputSchema: trackAlertOutcomeStepOutputSchema,
};
