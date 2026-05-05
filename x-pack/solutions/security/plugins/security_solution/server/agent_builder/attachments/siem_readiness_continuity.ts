/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const pipelineRowSchema = z.object({
  pipeline_name: z.string().min(1).max(512),
  status: z.enum(['healthy', 'critical']),
  failure_rate: z.string().max(32),
});

const siemReadinessContinuityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  pipelines: z.array(pipelineRowSchema).max(200),
  summary: z.string().max(1000).optional(),
});

export type SiemReadinessContinuityAttachmentData = z.infer<
  typeof siemReadinessContinuityAttachmentDataSchema
>;

const isContinuityAttachmentData = (data: unknown): data is SiemReadinessContinuityAttachmentData =>
  siemReadinessContinuityAttachmentDataSchema.safeParse(data).success;

const formatContinuityForAgent = (
  attachmentId: string,
  data: SiemReadinessContinuityAttachmentData
): string => {
  const lines = [`SIEM Readiness – Ingest Pipelines snapshot (id: "${attachmentId}")`];
  for (const p of data.pipelines) {
    lines.push(
      `Pipeline: ${p.pipeline_name} | Status: ${p.status} | Failure rate: ${p.failure_rate}`
    );
  }
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  return lines.join('\n');
};

export const createSiemReadinessContinuityAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.siemReadinessContinuity,
  validate: (input) => {
    const result = siemReadinessContinuityAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const { data } = attachment;
    if (!isContinuityAttachmentData(data)) {
      throw new Error(
        `Invalid SIEM readiness continuity attachment data for attachment ${attachment.id}`
      );
    }
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatContinuityForAgent(attachment.id, data),
      }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A SIEM Readiness – Ingest Pipelines attachment. It renders a table of all ingest pipelines with their health status, failure rate, and a link to each pipeline's management page. Use this attachment when the user asks about pipeline health, pipeline failures, or ingestion issues.

Required fields:
- \`pipelines\`: array of pipeline rows (up to 200). Each row: \`{ pipeline_name, status, failure_rate }\` where \`pipeline_name\` is the exact pipeline name, \`status\` is "healthy" or "critical", \`failure_rate\` is a string (e.g. "2.5%").

Optional field: summary (prose description, max 1000 chars).

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. Emit the tag on its OWN LINE, with a BLANK LINE before and after it:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Rules: copy \`id\` and \`current_version\` VERBATIM. Do not wrap in backticks or code fences.`,
});
