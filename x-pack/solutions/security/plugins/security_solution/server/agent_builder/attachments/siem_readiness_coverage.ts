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

const siemReadinessCoverageAttachmentDataSchema = securityAttachmentDataSchema.extend({
  summary: z.string().max(2000).optional(),
  covered_rules: z.number().int().min(0),
  uncovered_rules: z.number().int().min(0),
  missing_integrations: z.array(z.string()).max(100),
  active_categories: z.array(z.string()).max(50),
});

export type SiemReadinessCoverageAttachmentData = z.infer<
  typeof siemReadinessCoverageAttachmentDataSchema
>;

const isCoverageAttachmentData = (data: unknown): data is SiemReadinessCoverageAttachmentData =>
  siemReadinessCoverageAttachmentDataSchema.safeParse(data).success;

const formatCoverageForAgent = (
  attachmentId: string,
  data: SiemReadinessCoverageAttachmentData
): string => {
  const lines = [
    `SIEM Readiness – Rule Coverage snapshot (id: "${attachmentId}")`,
    `Covered rules: ${data.covered_rules}`,
    `Uncovered rules: ${data.uncovered_rules}`,
    `Active data categories: ${data.active_categories.join(', ') || 'none'}`,
  ];
  if (data.missing_integrations.length) {
    lines.push(
      `Missing integrations (${data.missing_integrations.length}): ${data.missing_integrations
        .slice(0, 20)
        .join(', ')}${data.missing_integrations.length > 20 ? '…' : ''}`
    );
  } else {
    lines.push('Missing integrations: none');
  }
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  return lines.join('\n');
};

export const createSiemReadinessCoverageAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.siemReadinessCoverage,
  validate: (input) => {
    const result = siemReadinessCoverageAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const { data } = attachment;
    if (!isCoverageAttachmentData(data)) {
      throw new Error(
        `Invalid SIEM readiness coverage attachment data for attachment ${attachment.id}`
      );
    }
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatCoverageForAgent(attachment.id, data),
      }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A SIEM Readiness – Rule Coverage attachment. It renders a live coverage panel showing which detection rules have the necessary integrations installed and which are missing integrations. Use this attachment when the user asks about rule coverage, detection coverage, missing integrations, or MITRE ATT&CK coverage. The panel includes an "All enabled rules" / "MITRE ATT&CK enabled rules" toggle and links to install missing integrations.

Required fields: covered_rules (number of rules with all integrations present), uncovered_rules (number of rules with missing integrations), missing_integrations (array of integration names that are not installed/enabled), active_categories (array of ECS category names with active data).
Optional field: summary (prose summary of the coverage state, max 2000 chars).

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. Emit the tag on its OWN LINE, with a BLANK LINE before and after it:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Rules: copy \`id\` and \`current_version\` VERBATIM. Do not wrap in backticks or code fences.`,
});
