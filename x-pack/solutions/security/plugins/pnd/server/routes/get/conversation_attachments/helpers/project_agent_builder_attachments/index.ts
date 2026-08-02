/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { PndConversationAttachment } from '@kbn/pnd-common';

import { clipToLength } from '../../../../post/threads_ensure/helpers/clip_to_length';

/** `GetConversationAttachmentsResponse.attachments` is `maxItems: 100`. */
export const PND_MAX_PROJECTED_ATTACHMENTS = 100;

/** `PndConversationAttachment.content` is `maxLength: 100000`. */
export const ATTACHMENT_CONTENT_MAX_LENGTH = 100_000;

/** `PndConversationAttachment.description` is `maxLength: 1024`. */
export const ATTACHMENT_DESCRIPTION_MAX_LENGTH = 1024;

/**
 * The current version of an attachment, tolerating a `versions` array that is not there.
 *
 * PND reads Agent Builder through an unvalidated self-client fetch, so a body that is not the
 * documented shape is reachable at runtime even though it is not reachable at compile time — the
 * same reason `truncateAttackDiscoveryTitle` accepts `undefined`. Agent Builder's own
 * `getLatestVersion` indexes into `versions` unconditionally and would throw, taking the whole
 * Attachments tab down with a `500` over one malformed attachment.
 */
const currentVersion = (attachment: VersionedAttachment) =>
  Array.isArray(attachment.versions)
    ? attachment.versions.find(({ version }) => version === attachment.current_version)
    : undefined;

/**
 * The text of a `type: 'text'` attachment, or nothing.
 *
 * `type` is an open string Agent Builder owns, so this narrows on the *data* rather than on the
 * type name: anything carrying a string `content` renders, and anything else (an `esql` query, a
 * visualization) is still listed, just without inline content. Keying on `type === 'text'` would
 * silently drop the content of a future text-shaped type.
 */
const textContent = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data == null || !('content' in data)) {
    return undefined;
  }

  const { content } = data as { content: unknown };

  return typeof content === 'string'
    ? clipToLength(content, ATTACHMENT_CONTENT_MAX_LENGTH)
    : undefined;
};

/**
 * Project Agent Builder's `VersionedAttachment[]` onto PND's own contract (D10).
 *
 * **A narrow projection, not a passthrough.** Re-publishing Agent Builder's versioning model from a
 * Security-owned route would make PND a second source of truth for a platform contract it does not
 * own, and it would drift the moment the platform adds a field. Only what the Attachments tab
 * renders crosses the boundary: identity, type, description, and the *current* version's text.
 *
 * **Every bound the response contract declares is enforced here**, because the route forwards
 * whatever Agent Builder returns and nothing validates the response body on the way out. `content`
 * and `description` are clipped, and the list is capped at {@link PND_MAX_PROJECTED_ATTACHMENTS}
 * (the route still reports the true count as `total`, so a truncated list is visible as
 * `total > attachments.length` rather than silent). `id` and `type` are forwarded verbatim: they
 * are identifiers, and a clipped identifier is a wrong one, not a shortened one.
 *
 * **An attachment is never dropped.** An unreadable or non-text payload yields an entry with no
 * `content` rather than no entry, so the tab can list an artifact it cannot render inline — the
 * three PND-created ids are the set `.21` relies on being present.
 */
export const projectAgentBuilderAttachments = (
  attachments: VersionedAttachment[]
): PndConversationAttachment[] =>
  attachments.slice(0, PND_MAX_PROJECTED_ATTACHMENTS).map((attachment) => {
    const version = currentVersion(attachment);
    const content = textContent(version?.data);

    return {
      ...(content == null ? {} : { content }),
      ...(typeof version?.created_at === 'string' ? { createdAt: version.created_at } : {}),
      ...(typeof attachment.description === 'string'
        ? {
            description: clipToLength(attachment.description, ATTACHMENT_DESCRIPTION_MAX_LENGTH),
          }
        : {}),
      id: attachment.id,
      type: attachment.type,
      ...(typeof attachment.current_version === 'number'
        ? { version: attachment.current_version }
        : {}),
    };
  });
