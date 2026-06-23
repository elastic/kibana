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

export const ReadCaptureConfigStepTypeId = 'error-sentry.readCaptureConfig' as const;

export const ReadCaptureConfigInputSchema = z.object({});

export const ReadCaptureConfigOutputSchema = z.object({
  index: z.string().describe('Log index or pattern to use for capture.'),
  categoryField: z.string().describe('Text field to use for categorize_text.'),
  logLevels: z
    .array(z.string())
    .describe('Log levels to filter on, e.g. ["ERROR","FATAL","WARN"].'),
  configured: z
    .boolean()
    .describe('True if a saved configuration was found; false if built-in defaults were used.'),
});

export type ReadCaptureConfigInputSchemaType = typeof ReadCaptureConfigInputSchema;
export type ReadCaptureConfigOutputSchemaType = typeof ReadCaptureConfigOutputSchema;

export const readCaptureConfigCommonDefinition: CommonStepDefinition<
  ReadCaptureConfigInputSchemaType,
  ReadCaptureConfigOutputSchemaType
> = {
  id: ReadCaptureConfigStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('xpack.errorSentry.readCaptureConfig.label', {
    defaultMessage: 'Read capture configuration',
  }),
  description: i18n.translate('xpack.errorSentry.readCaptureConfig.description', {
    defaultMessage:
      'Reads the Error Sentry capture configuration from Elasticsearch. Falls back to built-in defaults if no configuration has been saved yet.',
  }),
  documentation: {
    details: i18n.translate('xpack.errorSentry.readCaptureConfig.documentation.details', {
      defaultMessage:
        'Returns {index} and {categoryField} from the Error Sentry configuration document. Run {introspect} first to populate it.',
      values: {
        index: '`index`',
        categoryField: '`categoryField`',
        introspect: '`error-sentry.introspectLogs`',
      },
    }),
    examples: [
      `## Read saved log configuration\n\`\`\`yaml\n- name: config\n  type: ${ReadCaptureConfigStepTypeId}\n\`\`\``,
    ],
  },
  inputSchema: ReadCaptureConfigInputSchema,
  outputSchema: ReadCaptureConfigOutputSchema,
};
