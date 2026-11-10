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
      .enum(['no_analysis', 'unchanged', 'summary_only', 'cancelled'])
      .optional()
      .describe(
        'Why nothing was written: the Investigation has no finished Endpoint Analysis, the card is already current, only its summary was reworded, or a newer run cancelled this one.'
      ),
    attachment_id: z.string().optional().describe('Id of the current summary card attachment.'),
    action: z
      .enum(['created', 'reposted'])
      .optional()
      .describe(
        'Whether the first card was added, or the card was posted again in place of the older one because what it shows changed.'
      ),
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
        'Renders one HTML summary card for an Investigation that Endpoint Analysis has finished: the verdict, the decisions left to make, the kill chain, the timeline, the indicators and the alerts. Writes nothing when the card is already current.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
};
