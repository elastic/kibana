/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/**
 * Builds the shared "## INLINE RENDERING (REQUIRED)" block used by every read-only
 * Hunt Watch attachment type. Only the attachment id and the noun naming what gets
 * rendered ("threat pill", "event card", "correlation table") vary between types.
 */
const buildInlineRenderingBlock = ({
  id,
  renderNoun,
}: {
  id: string;
  renderNoun: string;
}): string => `## INLINE RENDERING (REQUIRED)
When a ${id} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, or rewrite them.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the ${renderNoun} first.
- Render each ${id} attachment at most once per turn.
`;

/**
 * Builds a read-only {@link AttachmentTypeDefinition} shared by every Hunt Watch
 * attachment type that is produced by the system and only ever formatted for the
 * agent, never created or updated through the attachment_add/update tools.
 */
export const createReadonlyAttachmentType = <T>({
  id,
  schema,
  readSchema = schema,
  formatForAgent,
  describePayload,
  renderNoun,
  maxContentLength,
}: {
  id: string;
  schema: z.ZodType<T>;
  /**
   * Used by `format` instead of `schema`, for types whose payload carries optional display
   * fields. Defaults to `schema`. Writes must stay strict, but a payload persisted by an
   * earlier build can hold a display field this one rejects, and failing the whole attachment
   * over one stale field would make it unpresentable to the agent for the rest of its life.
   */
  readSchema?: z.ZodType<T>;
  formatForAgent: (data: T) => string;
  describePayload: string;
  renderNoun: string;
  /**
   * Overrides the platform's `DEFAULT_MAX_CONTENT_LENGTH` (10 000 characters) for this
   * attachment type. Each type's payload is bounded by its schema's per-field max lengths
   * and array `.max()` caps, but those still combine well past 10 000 characters on a
   * maximally-sized valid payload, so callers must size this to the type's own bounded
   * worst case (see the type's own `*.ts` file for the accompanying max-size-payload
   * test) rather than leaving it unset. `getRepresentation` hard-truncates anything that
   * still exceeds it.
   */
  maxContentLength: number;
}): AttachmentTypeDefinition => ({
  id,
  // System-produced: the agent must not create or update these via the
  // attachment_add/update tools. Also gates the attachment_read path, which only
  // invokes format() for readonly types.
  isReadonly: true,
  maxContentLength,
  validate: (input) => {
    const parseResult = schema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    // Failing here means the payload has nothing usable left, not merely a stale display
    // field, since `readSchema` drops those rather than rejecting the attachment.
    const parseResult = readSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(`Invalid ${id} attachment data for attachment ${attachment.id}`);
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => {
        const value = formatForAgent(data);
        if (value.length <= maxContentLength) {
          return { type: 'text', value };
        }
        // The schema's per-field max lengths and array caps bound a valid payload, but at
        // their maximum they can still combine to exceed maxContentLength.
        const truncationNotice = `\n\n[truncated: representation exceeded ${maxContentLength} characters]`;
        return {
          type: 'text',
          value: value.slice(0, maxContentLength - truncationNotice.length) + truncationNotice,
        };
      },
    };
  },
  getAgentDescription: () => `
${describePayload}

${buildInlineRenderingBlock({ id, renderNoun })}`,
});
