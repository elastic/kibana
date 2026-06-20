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
import { CAPTURE_CONFIG_DOC_ID, CAPTURE_CONFIG_INDEX } from '../constants';

export const IntrospectLogsStepTypeId = 'error-sentry.introspectLogs' as const;

export const IntrospectLogsInputSchema = z.object({
  candidateIndexPatterns: z
    .array(z.string())
    .default(['logs.otel', 'logs-*', 'filebeat-*', 'logstash-*'])
    .describe('Log index patterns to probe, in priority order.'),
  preferredCategoryFields: z
    .array(z.string())
    .default(['body.text', 'message', 'log.message', 'event.original'])
    .describe('Text fields to consider for categorize_text, in priority order.'),
  lookbackDays: z
    .number()
    .int()
    .positive()
    .default(7)
    .describe('Recency window (days) used to check whether an index has recent data.'),
  configIndex: z
    .string()
    .default(CAPTURE_CONFIG_INDEX)
    .describe('Elasticsearch index used to persist the discovered configuration.'),
  configDocId: z
    .string()
    .default(CAPTURE_CONFIG_DOC_ID)
    .describe('Document ID of the configuration document.'),
});

export const IntrospectLogsOutputSchema = z.object({
  index: z.string().describe('The chosen log index or pattern.'),
  categoryField: z.string().describe('The chosen field for categorize_text.'),
  docsCount: z.number().describe('Approximate number of recent log documents in the chosen index.'),
});

export type IntrospectLogsInputSchemaType = typeof IntrospectLogsInputSchema;
export type IntrospectLogsOutputSchemaType = typeof IntrospectLogsOutputSchema;

export const introspectLogsCommonDefinition: CommonStepDefinition<
  IntrospectLogsInputSchemaType,
  IntrospectLogsOutputSchemaType
> = {
  id: IntrospectLogsStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('xpack.errorSentry.introspectLogs.label', {
    defaultMessage: 'Introspect log configuration',
  }),
  description: i18n.translate('xpack.errorSentry.introspectLogs.description', {
    defaultMessage:
      'Discovers the best log index and categorization field for Error Sentry, then saves the result to Elasticsearch.',
  }),
  documentation: {
    details: i18n.translate('xpack.errorSentry.introspectLogs.documentation.details', {
      defaultMessage:
        'Probes each entry in {candidateIndexPatterns} in order, picks the first with recent data, inspects its field mappings to find a suitable {text} field, and writes the result to {configIndex}.',
      values: {
        candidateIndexPatterns: '`candidateIndexPatterns`',
        text: '`text`-type',
        configIndex: '`configIndex`',
      },
    }),
    examples: [
      `## Discover and save log configuration\n\`\`\`yaml\n- name: introspect\n  type: ${IntrospectLogsStepTypeId}\n\`\`\``,
    ],
  },
  inputSchema: IntrospectLogsInputSchema,
  outputSchema: IntrospectLogsOutputSchema,
};
