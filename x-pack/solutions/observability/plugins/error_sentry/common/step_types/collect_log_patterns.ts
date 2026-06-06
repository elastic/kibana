/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const CollectLogPatternsStepTypeId = 'error-sentry.collectLogPatterns' as const;

export const InputSchema = z.object({
  index: z.string().describe('Index, alias or data stream to search (e.g. "logs-*").'),
  lookbackDays: z
    .number()
    .int()
    .positive()
    .default(7)
    .describe('How many days back from now to search.'),
  categoryField: z
    .string()
    .default('message')
    .describe('Text field to categorize (e.g. "message").'),
  timestampField: z
    .string()
    .default('@timestamp')
    .describe('Date field used for the time-range filter.'),
  minDocCount: z
    .number()
    .int()
    .nonnegative()
    .default(50)
    .describe('Drop categories with fewer than this many occurrences.'),
  size: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe('Maximum number of categories to return.'),
  logLevels: z
    .array(z.string())
    .optional()
    .describe(
      'Restrict to these log levels (matched on log.level.keyword / log.level), e.g. ["ERROR","FATAL"]. Omit to categorize all messages.'
    ),
  samplingProbability: z
    .number()
    .gt(0)
    .max(0.5)
    .optional()
    .describe(
      'When set (0–0.5], wrap categorize_text in a random_sampler so the query stays affordable on busy/broad indices. Doc counts are auto-scaled by 1/probability.'
    ),
});

export const PatternSchema = z.object({
  key: z.string().describe('The categorized log pattern (tokens common to the group).'),
  hash: z
    .string()
    .describe('Stable short fingerprint of the pattern, suitable as a dedup marker (e.g. a case tag).'),
  docCount: z.number().describe('Number of documents matching this pattern in the window.'),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .describe('Severity derived from the occurrence count (maps to case severity).'),
  sampleMessage: z.string().optional().describe('One representative message for the pattern.'),
});

export const OutputSchema = z.object({
  total: z.number().describe('Number of patterns returned (after min-count filtering).'),
  patterns: z.array(PatternSchema),
});

export type CollectLogPatternsInputSchema = typeof InputSchema;
export type CollectLogPatternsOutputSchema = typeof OutputSchema;

export const collectLogPatternsCommonDefinition: CommonStepDefinition<
  CollectLogPatternsInputSchema,
  CollectLogPatternsOutputSchema
> = {
  id: CollectLogPatternsStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('errorSentry.collectLogPatterns.label', {
    defaultMessage: 'Collect log patterns',
  }),
  description: i18n.translate('errorSentry.collectLogPatterns.description', {
    defaultMessage:
      'Finds recurring log patterns using the Elasticsearch categorize_text aggregation.',
  }),
  documentation: {
    details: i18n.translate('errorSentry.collectLogPatterns.documentation.details', {
      defaultMessage:
        'Runs the categorize_text aggregation over {index} for the last {lookbackDays} days and returns the recurring patterns. Iterate the result with a foreach step over {ref}.',
      values: {
        index: '`index`',
        lookbackDays: '`lookbackDays`',
        ref: '`{{ steps.<name>.output.patterns }}`',
      },
    }),
    examples: [
      `## Collect recurring error patterns
\`\`\`yaml
- name: collect
  type: ${CollectLogPatternsStepTypeId}
  with:
    index: "logs-*"
    lookbackDays: 7
    categoryField: "message"
    minDocCount: 50
    size: 20
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
