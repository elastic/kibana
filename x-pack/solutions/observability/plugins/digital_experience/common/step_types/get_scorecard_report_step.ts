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
import { MAX_ENVIRONMENT_LENGTH, MAX_SERVICE_NAME_LENGTH } from '../filter_lengths';

export const GetScorecardReportStepTypeId = 'digital-experience.getScorecardReport';

/** Longest period the step reports on. */
export const MAX_LOOKBACK_DAYS = 90;
export const DEFAULT_LOOKBACK_DAYS = 7;

export const InputSchema = lazySchema(() =>
  z.object({
    serviceName: z
      .string()
      .min(1)
      .max(MAX_SERVICE_NAME_LENGTH)
      .describe('The name of the EDOT Browser application.'),
    environment: z
      .string()
      .max(MAX_ENVIRONMENT_LENGTH)
      .optional()
      .describe('Only this environment; all of them when left out.'),
    lookbackDays: z
      .number()
      .int()
      .min(1)
      .max(MAX_LOOKBACK_DAYS)
      .default(DEFAULT_LOOKBACK_DAYS)
      .describe('How many days back from now to report on, compared with the same number before.'),
  })
);

const PeriodSchema = lazySchema(() => z.object({ start: z.number(), end: z.number() }));

const VitalRatingsSchema = lazySchema(() =>
  z.object({
    good: z.number(),
    needsImprovement: z.number(),
    poor: z.number(),
  })
);

const MeasureSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    unit: z.enum(['count', 'ms', 'score', 'rate', 'ratio']),
    value: z.number().nullable(),
    previous: z.number().nullable(),
    change: z.number().nullable(),
    direction: z.enum(['better', 'worse', 'unchanged', 'neutral', 'unknown']),
    rating: z.enum(['good', 'needsImprovement', 'poor']).nullable(),
    ratings: VitalRatingsSchema.nullable(),
  })
);

export const OutputSchema = lazySchema(() =>
  z.object({
    report: z.object({
      serviceName: z.string(),
      environment: z.string().optional(),
      environments: z.array(z.string()),
      period: PeriodSchema,
      previousPeriod: PeriodSchema,
      generatedAt: z.number(),
      sections: z.array(
        z.object({
          id: z.enum(['traffic', 'webVitals']),
          title: z.string(),
          measures: z.array(MeasureSchema),
        })
      ),
    }),
    summary: z
      .string()
      .describe(
        'The key numbers and their change, in markdown, e.g. as a message or an email body.'
      ),
  })
);

export type GetScorecardReportStepInputSchema = typeof InputSchema;
export type GetScorecardReportStepOutputSchema = typeof OutputSchema;

export const getScorecardReportStepCommonDefinition: CommonStepDefinition<
  GetScorecardReportStepInputSchema,
  GetScorecardReportStepOutputSchema
> = {
  id: GetScorecardReportStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.translate('xpack.digitalExperience.workflows.getScorecardReport.label', {
    defaultMessage: 'Digital Experience scorecard',
  }),
  description: i18n.translate('xpack.digitalExperience.workflows.getScorecardReport.description', {
    defaultMessage:
      'Gets the scorecard of an EDOT Browser application: page loads, load time, errors and Core Web Vitals, compared with the previous period.',
  }),
  documentation: {
    details: i18n.translate('xpack.digitalExperience.workflows.getScorecardReport.details', {
      defaultMessage:
        'Returns the scorecard as data in {report} and as a markdown {summary}, for the last {lookbackDays} days compared with the same number of days before them. It reads the data as the user the workflow runs as.',
      values: {
        report: '`report`',
        summary: '`summary`',
        lookbackDays: '`lookbackDays`',
      },
    }),
    examples: [
      `## Weekly scorecard
\`\`\`yaml
- name: scorecard
  type: ${GetScorecardReportStepTypeId}
  with:
    serviceName: "storefront-web"
    environment: "production"
    lookbackDays: 7
\`\`\`
Use \`{{ steps.scorecard.output.summary }}\` as the message of a Slack or email step.`,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
