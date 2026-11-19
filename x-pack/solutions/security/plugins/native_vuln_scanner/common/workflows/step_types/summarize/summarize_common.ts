/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { z, lazySchema } from '@kbn/zod/v4';
import { fetchFeedOutputSchema } from '../fetch_feed/fetch_feed_common';
import { matchOutputSchema } from '../match/match_common';

export const SUMMARIZE_STEP_TYPE = 'native_vuln.summarize' as const;

export const SUMMARY_RUN_STATUSES = ['success', 'partial', 'failed', 'aborted', 'no_pack'] as const;

export const summarizeInputSchema = lazySchema(() =>
  z.object({
    /** The `native_vuln.fetch_feed` output; absent when that step failed. */
    fetch: fetchFeedOutputSchema.nullable().optional(),
    /** The `native_vuln.match` output; absent when that step failed or was skipped. */
    match: matchOutputSchema.nullable().optional(),
    fetch_error: z.string().nullable().optional(),
    match_error: z.string().nullable().optional(),
  })
);

export const summarizeOutputSchema = lazySchema(() =>
  z.object({
    run_id: z.string(),
    status: z.enum(SUMMARY_RUN_STATUSES),
    index: z.string(),
  })
);

export type SummarizeInput = z.infer<typeof summarizeInputSchema>;
export type SummarizeOutput = z.infer<typeof summarizeOutputSchema>;

export const summarizeStepCommonDefinition: BaseStepDefinition<
  typeof summarizeInputSchema,
  typeof summarizeOutputSchema
> = {
  id: SUMMARIZE_STEP_TYPE,
  label: i18n.translate('xpack.nativeVulnScanner.workflows.steps.summarize.label', {
    defaultMessage: 'Record vulnerability scan summary',
  }),
  description: i18n.translate('xpack.nativeVulnScanner.workflows.steps.summarize.description', {
    defaultMessage:
      'Writes one summary document for the scan run (hosts scanned, findings opened and fixed, per-feed status, failures) to the scanner run index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: summarizeInputSchema,
  outputSchema: summarizeOutputSchema,
};
