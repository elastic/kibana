/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  AttachmentTypeDefinition,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import { alertZeroAttachmentDataSchema } from '../../../common/attachment_data_schema';

export const THREAT_ATTACHMENT_ID = ALERTZERO_ATTACHMENT_TYPES.threat;

/**
 * By-reference trigger carrier: the payload names a threat report by id, plus captured
 * display fallbacks. The live document itself is resolved client-side, space-projected,
 * by the `security.threat` renderer — the server only validates and formats the
 * reference and its fallback fields.
 */
export const threatAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  report_id: z.string().min(1).max(512),
  title: z.string().min(1).max(512).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.string().min(1).max(256).optional(),
});

export type ThreatAttachmentData = z.infer<typeof threatAttachmentDataSchema>;

const formatThreatForAgent = (data: ThreatAttachmentData): string => {
  const lines = ['Threat report reference', `Report id: ${data.report_id}`];
  if (data.title) {
    lines.push(`Title: ${data.title}`);
  }
  if (data.severity) {
    lines.push(`Severity: ${data.severity}`);
  }
  if (data.source) {
    lines.push(`Source: ${data.source}`);
  }
  lines.push(
    'The captured fields above are a fallback snapshot; the live report document is resolved ' +
      'space-projected by the viewer when rendered.'
  );
  return lines.join('\n');
};

const getAgentDescription = (): string => `
This attachment names a threat intelligence report by reference (by-reference semantics).
The payload contains:
- report_id: the id of the threat report this attachment points to
- title, severity, source (optional): a captured fallback snapshot taken at write time

The live report document is fetched space-projected at render time; the captured fields above
are only a fallback used when the live document cannot be resolved. Quote the captured fields
verbatim when discussing this attachment rather than restating the full report from memory.

## INLINE RENDERING (REQUIRED)
When a ${THREAT_ATTACHMENT_ID} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, or rewrite them.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the threat pill first.
- Render each ${THREAT_ATTACHMENT_ID} attachment at most once per turn.
`;

export const createThreatAttachmentType = (): AttachmentTypeDefinition => ({
  id: THREAT_ATTACHMENT_ID,
  // System-produced reference: the agent must not create or update these via the
  // attachment_add/update tools. Also gates the attachment_read path, which only
  // invokes format() for readonly types.
  isReadonly: true,
  validate: (input) => {
    const parseResult = threatAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>, _context: AttachmentFormatContext) => {
    const parseResult = threatAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(`Invalid threat attachment data for attachment ${attachment.id}`);
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => ({ type: 'text', value: formatThreatForAgent(data) }),
    };
  },
  getAgentDescription,
});
