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
  severityStrategy: z
    .enum(['severity', 'text'])
    .describe('How to filter logs: by severity field value, or by text keyword matching.'),
  severityField: z
    .string()
    .optional()
    .describe('The severity field used when strategy is "severity" (e.g. log.level, severity_text).'),
  logLevels: z
    .array(z.string())
    .describe('Log level values to pass to the collect step when strategy is "severity".'),
  textFilter: z
    .string()
    .optional()
    .describe('Error vocabulary query string used when strategy is "text".'),
  k8s: z
    .object({
      podKey: z.string().optional(),
      namespaceKey: z.string().optional(),
      deploymentKey: z.string().optional(),
      hostKey: z.string().optional(),
      serviceKey: z.string().optional(),
    })
    .optional()
    .describe('Detected Kubernetes attribute keys found in a sampled document.'),
  totalDocs7d: z.number().describe('Total documents in the chosen index in the lookback window.'),
  errorMatchingDocs7d: z
    .number()
    .describe('Documents matching the error vocabulary query in the lookback window.'),
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
      'Discovers the best log index, category field, severity strategy, and k8s attributes for Error Sentry, then writes the full enriched configuration to Elasticsearch.',
  }),
  documentation: {
    details: i18n.translate('xpack.errorSentry.introspectLogs.documentation.details', {
      defaultMessage:
        'Probes each entry in {candidateIndexPatterns} for recent data, picks the best index, inspects mappings for a {text} field, probes severity field coverage via ESQL, samples a recent document for Kubernetes attribute keys, and writes the full enriched config to {configIndex}.',
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
