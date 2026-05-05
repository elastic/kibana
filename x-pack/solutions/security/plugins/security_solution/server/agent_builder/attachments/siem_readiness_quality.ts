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

const qualityIndexRowSchema = z.object({
  index_name: z.string().min(1).max(512),
  status: z.enum(['healthy', 'incompatible']),
  incompatible_fields: z.number().int().min(0),
});

const siemReadinessQualityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  summary: z.string().max(2000).optional(),
  checked_indices: z.number().int().min(0),
  healthy_indices: z.number().int().min(0),
  incompatible_indices: z.number().int().min(0),
  unchecked_indices: z.number().int().min(0),
  indices: z.array(qualityIndexRowSchema).max(200).optional(),
});

export type SiemReadinessQualityAttachmentData = z.infer<
  typeof siemReadinessQualityAttachmentDataSchema
>;

const isQualityAttachmentData = (data: unknown): data is SiemReadinessQualityAttachmentData =>
  siemReadinessQualityAttachmentDataSchema.safeParse(data).success;

const formatQualityForAgent = (
  attachmentId: string,
  data: SiemReadinessQualityAttachmentData
): string => {
  const lines = [
    `SIEM Readiness – Data Quality snapshot (id: "${attachmentId}")`,
    `Checked indices: ${data.checked_indices}`,
    `Healthy: ${data.healthy_indices}`,
    `Incompatible: ${data.incompatible_indices}`,
    `Unchecked: ${data.unchecked_indices}`,
  ];
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  return lines.join('\n');
};

export const createSiemReadinessQualityAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.siemReadinessQuality,
  validate: (input) => {
    const result = siemReadinessQualityAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const { data } = attachment;
    if (!isQualityAttachmentData(data)) {
      throw new Error(
        `Invalid SIEM readiness quality attachment data for attachment ${attachment.id}`
      );
    }
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatQualityForAgent(attachment.id, data),
      }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A SIEM Readiness – Data Quality attachment. It renders a button linking to the Data Quality Dashboard where users can check ECS field compatibility across their indices. Use this attachment when the user asks about data quality, ECS compatibility, field mapping issues, or data quality checks.

Required fields: checked_indices (number of indices that have been checked), healthy_indices (number of indices with no incompatible fields), incompatible_indices (number of indices with ECS field incompatibilities), unchecked_indices (number of indices not yet checked).
Optional field: summary (prose summary of the quality state, max 2000 chars).

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. Emit the tag on its OWN LINE, with a BLANK LINE before and after it:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Rules: copy \`id\` and \`current_version\` VERBATIM. Do not wrap in backticks or code fences.`,
});
