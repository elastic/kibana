/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAttachmentAlreadyExistsError,
  isAttachmentNotFoundError,
  isConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import {
  HUNT_SESSION_ATTACHMENT_ID,
  HUNT_SESSION_ATTACHMENT_MAX_BYTES,
  huntSessionAttachmentSchema,
  type HuntSessionAttachment,
} from '../../common/hunt_session_attachment_schema';
import { HUNT_SESSION_ATTACHMENT_TYPE } from '../agent_builder/attachments/hunt_session';

export const HUNT_SESSION_MAX_WRITE_ATTEMPTS = 5;

export type HuntSessionStoreErrorCode = 'too_large' | 'write_conflict' | 'invalid';

const HUNT_SESSION_STORE_ERROR_MESSAGES: Record<HuntSessionStoreErrorCode, string> = {
  // The request would make the attachment larger than the limit; nothing was written.
  too_large: 'The Hunt session is too large. Select fewer rows and try again.',
  // Every write attempt lost a race; nothing is reported as saved.
  write_conflict: 'The Hunt session was changed by someone else. Try again.',
  // The resulting document breaks a limit, such as the evidence fingerprint cap.
  invalid: 'The Hunt session is not valid.',
};

/** A write the store refused or could not confirm. `code` says why; nothing partial is reported. */
export class HuntSessionStoreError extends Error {
  constructor(public readonly code: HuntSessionStoreErrorCode, detail?: string) {
    super(detail ?? HUNT_SESSION_STORE_ERROR_MESSAGES[code]);
    this.name = 'HuntSessionStoreError';
  }
}

/** The new document, without the counter the store owns. */
export type HuntSessionDraft = Omit<HuntSessionAttachment, 'revision'>;

/**
 * Receives the current document (undefined before the first write) and returns the next one. It is
 * re-run on a conflict, so it must be safe to repeat: merge by id and fingerprint, never append blindly.
 */
export type HuntSessionMutation = (current: HuntSessionAttachment | undefined) => HuntSessionDraft;

const readLatest = async (
  attachments: Pick<AttachmentPublicClient, 'get'>,
  conversationId: string
) => {
  try {
    return await attachments.get({
      conversationId,
      attachmentId: HUNT_SESSION_ATTACHMENT_ID,
    });
  } catch (error) {
    if (isAttachmentNotFoundError(error)) return undefined;
    throw error;
  }
};

const parse = (data: unknown): HuntSessionAttachment | undefined => {
  const result = huntSessionAttachmentSchema.safeParse(data);
  return result.success ? result.data : undefined;
};

/** The current Hunt session document on an Investigation, if it has one. */
export const readHuntSessionAttachment = async ({
  attachments,
  conversationId,
}: {
  attachments: Pick<AttachmentPublicClient, 'get'>;
  conversationId: string;
}): Promise<HuntSessionAttachment | undefined> => {
  const attachment = await readLatest(attachments, conversationId);
  const current = attachment?.versions.find(
    ({ version }) => version === attachment.current_version
  );
  return current ? parse(current.data) : undefined;
};

/**
 * Creates the Hunt session attachment or applies `mutate` to it, keeping the document's own
 * `revision` counter. Each write is checked against Agent Builder's attachment version: if another
 * writer landed between this read and write, the version advanced by more than one, so this write
 * replaced theirs. The loop then re-applies `mutate` on top of the other writer's document and writes
 * again, so neither change is lost. After `HUNT_SESSION_MAX_WRITE_ATTEMPTS` attempts it fails; it
 * never reports success for a write it cannot confirm.
 *
 * Writes use `converse` access so an analyst who does not own the Investigation can add evidence.
 */
export const upsertHuntSessionAttachment = async ({
  attachments,
  conversationId,
  mutate,
  maxAttempts = HUNT_SESSION_MAX_WRITE_ATTEMPTS,
}: {
  attachments: Pick<AttachmentPublicClient, 'get' | 'create' | 'update'>;
  conversationId: string;
  mutate: HuntSessionMutation;
  maxAttempts?: number;
}): Promise<HuntSessionAttachment> => {
  let override: HuntSessionAttachment | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const existing = await readLatest(attachments, conversationId);
    const latest = existing?.versions.find(({ version }) => version === existing.current_version);
    const current = override ?? (latest ? parse(latest.data) : undefined);
    if (existing && !current) {
      throw new Error('The stored Hunt session is not valid and cannot be extended');
    }

    const next: HuntSessionAttachment = {
      ...mutate(current),
      revision: (current?.revision ?? 0) + 1,
    };
    if (Buffer.byteLength(JSON.stringify(next)) > HUNT_SESSION_ATTACHMENT_MAX_BYTES) {
      throw new HuntSessionStoreError('too_large');
    }
    const valid = huntSessionAttachmentSchema.safeParse(next);
    if (!valid.success) {
      throw new HuntSessionStoreError(
        'invalid',
        valid.error.issues.map(({ message }) => message).join('; ')
      );
    }

    try {
      if (!existing) {
        await attachments.create({
          conversationId,
          id: HUNT_SESSION_ATTACHMENT_ID,
          type: HUNT_SESSION_ATTACHMENT_TYPE,
          data: next,
          description: next.definition.name,
          readonly: true,
          render_inline: true,
          access: 'converse',
        });
        return next;
      }

      const updated = await attachments.update({
        conversationId,
        attachmentId: HUNT_SESSION_ATTACHMENT_ID,
        data: next,
        render_inline: true,
        access: 'converse',
      });
      if (updated.current_version === existing.current_version + 1) return next;

      // Another writer landed first and this write sits on top of theirs. Rebuild from theirs.
      const theirs = updated.versions
        .filter(
          ({ version }) => version > existing.current_version && version < updated.current_version
        )
        .pop();
      override = theirs ? parse(theirs.data) : undefined;
    } catch (error) {
      if (isAttachmentAlreadyExistsError(error) || isConversationWriteConflictError(error)) {
        override = undefined;
        continue;
      }
      throw error;
    }
  }

  throw new HuntSessionStoreError('write_conflict');
};
