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

const retentionRowSchema = z.object({
  index_name: z.string().min(1).max(512),
  managed_by: z.enum(['ILM', 'DSL', 'None']),
  is_data_stream: z.boolean(),
  policy_name: z.string().max(256).nullish(),
  status: z.enum(['healthy', 'non-compliant']),
  retention_period: z.string().max(64).nullish(),
});

const siemReadinessRetentionAttachmentDataSchema = securityAttachmentDataSchema.extend({
  indices: z.array(retentionRowSchema).max(200),
  summary: z.string().max(1000).optional(),
});

export type SiemReadinessRetentionAttachmentData = z.infer<
  typeof siemReadinessRetentionAttachmentDataSchema
>;

const isRetentionAttachmentData = (data: unknown): data is SiemReadinessRetentionAttachmentData =>
  siemReadinessRetentionAttachmentDataSchema.safeParse(data).success;

const formatRetentionForAgent = (
  attachmentId: string,
  data: SiemReadinessRetentionAttachmentData
): string => {
  const lines = [`SIEM Readiness – Retention snapshot (id: "${attachmentId}")`];
  for (const idx of data.indices) {
    const parts = [
      `Index: ${idx.index_name}`,
      `Status: ${idx.status}`,
      `Managed by: ${idx.managed_by}`,
    ];
    if (idx.retention_period) parts.push(`Retention: ${idx.retention_period}`);
    if (idx.policy_name) parts.push(`Policy: ${idx.policy_name}`);
    lines.push(parts.join(' | '));
  }
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  return lines.join('\n');
};

export const createSiemReadinessRetentionAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.siemReadinessRetention,
  validate: (input) => {
    const result = siemReadinessRetentionAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const { data } = attachment;
    if (!isRetentionAttachmentData(data)) {
      throw new Error(
        `Invalid SIEM readiness retention attachment data for attachment ${attachment.id}`
      );
    }
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatRetentionForAgent(attachment.id, data),
      }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A SIEM Readiness – Retention attachment. It renders a table of indices/data streams with their retention status, management type, retention period, and a link to the relevant index management page for each row. Use this attachment when the user asks about data retention, retention compliance, ILM policies, or how long data is kept.

Required fields:
- \`indices\`: array of index rows (up to 200). Each row: \`{ index_name, managed_by, is_data_stream, status, policy_name?, retention_period? }\` where:
  - \`index_name\`: exact index/data stream name
  - \`managed_by\`: "ILM", "DSL", or "None"
  - \`is_data_stream\`: boolean
  - \`status\`: "healthy" or "non-compliant"
  - \`policy_name\`: ILM policy name (only when managed_by is "ILM", omit or null otherwise)
  - \`retention_period\`: retention period string (e.g. "30 days"), or null/omit if not configured

Optional field: summary (prose description, max 1000 chars).

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. Emit the tag on its OWN LINE, with a BLANK LINE before and after it:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Rules: copy \`id\` and \`current_version\` VERBATIM. Do not wrap in backticks or code fences.`,
});
