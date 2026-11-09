/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';

export const RENDER_FORENSICS_SUMMARY_STEP_ID = 'alertzero.forensics.renderSummary' as const;

const inputSchema = lazySchema(() =>
  z.object({
    conversation_id: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .describe('Investigation whose Endpoint Analysis is summarized.'),
  })
);

const outputSchema = lazySchema(() =>
  z.object({
    skipped: z.boolean().describe('True when the card was not written.'),
    reason: z
      .enum(['no_analysis', 'unchanged', 'cancelled'])
      .optional()
      .describe(
        'Why nothing was written: Endpoint Analysis never picked up the Investigation, the card is already current, or a newer run cancelled this one.'
      ),
    attachment_id: z.string().optional().describe('Id of the summary card attachment.'),
    action: z
      .enum(['created', 'updated'])
      .optional()
      .describe('Whether the card was added or a new version of it was written.'),
  })
);

export type RenderForensicsSummaryStepOutput = z.infer<typeof outputSchema>;

export const renderForensicsSummaryStepCommonDefinition: CommonStepDefinition<
  typeof inputSchema,
  typeof outputSchema
> = {
  id: RENDER_FORENSICS_SUMMARY_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.renderForensicsSummary.label', {
    defaultMessage: 'Render forensics summary',
  }),
  description: i18n.translate(
    'xpack.alertzero.workflows.steps.renderForensicsSummary.description',
    {
      defaultMessage:
        'Renders one HTML summary card of what Endpoint Analysis has left on an Investigation so far: the verdict, the decisions left to make, the kill chain, the timeline, the indicators and the alerts. Writes nothing when the card is already current.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
};
