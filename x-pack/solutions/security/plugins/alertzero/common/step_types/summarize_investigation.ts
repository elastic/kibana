/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const SUMMARIZE_INVESTIGATION_STEP_ID = 'alertzero.investigation.summarize' as const;

const inputSchema = z.object({
  conversation_id: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .describe('Investigation or escalation conversation to read and summarize.'),
});

const outputSchema = z.object({
  skipped: z.boolean().describe('True when no summary was written.'),
  reason: z
    .enum(['template', 'empty', 'incomplete'])
    .optional()
    .describe('Why the step wrote nothing.'),
  summary: z.string().optional().describe('Reading written to metadata.summary.'),
});

export const summarizeInvestigationStepCommonDefinition: CommonStepDefinition<
  typeof inputSchema,
  typeof outputSchema
> = {
  id: SUMMARIZE_INVESTIGATION_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.summarizeInvestigation.label', {
    defaultMessage: 'Summarize investigation',
  }),
  description: i18n.translate(
    'xpack.alertzero.workflows.steps.summarizeInvestigation.description',
    {
      defaultMessage:
        'Reads journal notes, comments, and added attachments, then writes the investigation summary.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
};
