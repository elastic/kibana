/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { DIAGNOSTIC_REPORT_ATTACHMENT_TYPE } from '../../../../common/constants';

const diagnosticReportDataSchema = z.object({
  content: z.string(),
});

type DiagnosticReportData = z.infer<typeof diagnosticReportDataSchema>;

const isDiagnosticReportData = (data: unknown): data is DiagnosticReportData =>
  diagnosticReportDataSchema.safeParse(data).success;

/**
 * Creates the server-side definition for the `diagnostic_report` attachment type.
 *
 * The `diagnostic_report` attachment carries a Markdown diagnostic report built
 * client-side by `buildDiagnosticReport()`. It is sent by the "Troubleshoot with AI"
 * feature in the Workflow Execution Details flyout so the AI agent has full context
 * about a failed Attack Discovery execution.
 */
export const createDiagnosticReportAttachmentType = (): AttachmentTypeDefinition => ({
  id: DIAGNOSTIC_REPORT_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = diagnosticReportDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  format: (
    attachment: Attachment<string, unknown>,
    _context: AttachmentFormatContext
  ): AgentFormattedAttachment => ({
    getRepresentation: () => {
      if (!isDiagnosticReportData(attachment.data)) {
        throw new Error(
          `Invalid diagnostic_report attachment data for attachment ${attachment.id}`
        );
      }
      return { type: 'text' as const, value: attachment.data.content };
    },
  }),

  getAgentDescription: () =>
    `You have been provided with an Attack Discovery diagnostic report. ` +
    `This report contains detailed information about a failed or incomplete Attack Discovery ` +
    `workflow execution, including the failure reason, pipeline phase timeline, step-level ` +
    `errors, pre-execution check results, and environment context. ` +
    `The report also includes: a Configuration section with workflow setup and connector details ` +
    `(connector model, provider, action type); a Quality Metrics section with hallucination filter ` +
    `counts, deduplication stats, and generated vs persisted discovery counts; ` +
    `a Per-Workflow Alert Retrieval section showing per-workflow alert counts and extraction strategy; ` +
    `and an Execution Trigger section identifying whether the execution was triggered manually, ` +
    `by a schedule, or by a workflow step. ` +
    `Use this diagnostic report to help the user understand what went wrong and how to resolve it.`,
});
