/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

/**
 * Any character outside this set risks triggering the upstream markdown
 * autolinker / email tokenizer (they run before the HTML tokenizer in
 * `remark-parse-no-trim` and shatter inline `<render_attachment>` tags
 * whose `id` contains `@` or URL-shaped substrings). The `build*AttachmentId`
 * helpers already emit `<namespace>:<type>:<hex>`, which satisfies this
 * pattern, so the regex is a belt-and-braces regression detector — not a
 * substitute for hashing.
 */
const AUTOLINK_SAFE_ATTACHMENT_ID_PATTERN = /^[a-z0-9:.]+$/;

/**
 * Returns a pre-formatted `<render_attachment id="..." version="..." />`
 * string the model can copy verbatim into its reply.
 *
 * Why pre-format server-side:
 * - Asking the model to assemble the tag from `attachmentId` / `version`
 *   has empirically produced hallucinated ids containing `@` or
 *   email-shaped substrings, which the upstream markdown pipeline
 *   shatters across multiple inline AST nodes (see the long comment on
 *   `buildSingleEntityAttachmentId` for mechanics). A ready-made string
 *   removes that degree of freedom.
 * - Using `renderAttachmentElement.tagName` / `.attributes` (from the
 *   platform common package) keeps this string in lockstep with whatever
 *   the markdown parser expects, so a future rename on the platform side
 *   does not silently desynchronise security-emitted tags.
 *
 * Callers MUST pass an id produced by one of the hashed `build*AttachmentId`
 * helpers; the assertion below fires otherwise so a future refactor that
 * bypasses hashing surfaces immediately instead of shipping a broken tag to
 * the client.
 */
export const buildRenderAttachmentTag = ({
  attachmentId,
  version,
}: {
  attachmentId: string;
  version: number;
}): string => {
  if (!AUTOLINK_SAFE_ATTACHMENT_ID_PATTERN.test(attachmentId)) {
    throw new Error(
      `buildRenderAttachmentTag received an unsafe attachmentId "${attachmentId}" — ` +
        `expected a hashed id from a build*AttachmentId helper.`
    );
  }
  const { tagName } = renderAttachmentElement;
  const { attachmentId: idAttr, version: versionAttr } = renderAttachmentElement.attributes;
  return `<${tagName} ${idAttr}="${attachmentId}" ${versionAttr}="${version}" />`;
};

/**
 * Creates or refreshes an attachment of the given `type` with the provided id
 * and data. Uses the deterministic id so repeated lookups in the same
 * conversation bump the version instead of piling up pills. Failures are
 * logged and swallowed — the tool result itself is still useful without the
 * inline attachment.
 */
export const ensureAttachment = async ({
  attachments,
  id,
  type,
  data,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  type: SecurityAgentBuilderAttachments;
  data: Record<string, unknown>;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> => {
  try {
    const existing = attachments.getAttachmentRecord(id);
    if (existing) {
      const updated = await attachments.update(id, { data, description });
      if (!updated) {
        return null;
      }
      return { attachmentId: updated.id, version: updated.current_version };
    }

    const created = await attachments.add({
      id,
      type,
      data,
      description,
    });
    return { attachmentId: created.id, version: created.current_version };
  } catch (error) {
    logger.warn(
      `Failed to persist ${type} attachment for ${id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};
