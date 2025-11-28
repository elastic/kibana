/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments/type_definition';

const logEntryAttachmentDataSchema = z.object({
  content: z.string(),
});

export type LogEntryAttachmentData = z.infer<typeof logEntryAttachmentDataSchema>;

/**
 * List of observability attachment types.
 *
 * These attachment types are specific to observability use cases and provide
 * structured data from logs, traces, and other observability data sources.
 */
export enum ObservabilityAttachmentType {
  logEntry = 'observability.log_entry',
}

/**
 * Attachment type for log entry analysis.
 *
 * This attachment type is used when users want to analyze individual log entries from Discover.
 * It provides the full log entry data including
 * all fields and their values to help the agent understand the log context.
 */
export const logEntryAttachmentType: AttachmentTypeDefinition<
  ObservabilityAttachmentType.logEntry,
  LogEntryAttachmentData
> = {
  id: ObservabilityAttachmentType.logEntry,
  // validate and parse the input when received from the client
  validate: (input) => {
    const parseResult = logEntryAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    } else {
      return { valid: false, error: parseResult.error.message };
    }
  },
  // format the data to be exposed to the LLM
  format: (attachment) => {
    return {
      getRepresentation: () => {
        return { type: 'text', value: (attachment?.data as LogEntryAttachmentData).content || '' };
      },
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    'Log entry data from Elastic Observability. Contains structured log fields including timestamp, message, log level, service name, host, and other contextual information. Use this to analyze log patterns, identify issues, explain log meanings, and provide troubleshooting guidance.',
};
