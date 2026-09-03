/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest, Logger } from '@kbn/core/server';

import {
  AGENT_BUILDER_API_VERSION,
  buildAgentBuilderAttachmentsPath,
} from '../../../../helpers/agent_builder_api';
import { scopedSelfPost } from '../../../../helpers/scoped_self_post';
import type { PndThreadAttachmentInput } from '../build_thread_attachments';

export interface CreateThreadAttachmentsParams {
  /** Exactly the three from `buildThreadAttachments`, each with a deterministic id. */
  attachments: PndThreadAttachmentInput[];
  /** The thread the attachments hang on. Must already exist — Agent Builder `get`s it first. */
  conversationId: string;
  http: HttpServiceStart;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
}

/** How many of the requested attachments are present after the call, and which were not. */
export interface CreateThreadAttachmentsResult {
  /** Ids that are on the conversation now, whether this call created them or found them. */
  present: string[];
  /** Ids that are **not** on the conversation. Empty on the happy path. */
  missing: string[];
}

/**
 * Create the three context attachments on a freshly materialised thread, as the calling user (D7).
 *
 * **Best-effort, but never silent** (the shape finding R4 established): a failed attachment must not
 * fail `_ensure` — the thread itself is the deliverable and it already exists by the time this runs
 * — but every failure is logged at `warn` and reported back, because `_ensure` is called from a
 * workflow step with `on-failure: { continue: true }` and would otherwise lose an attachment with
 * nothing anywhere saying so.
 *
 * **A `409` counts as present, not as a failure.** The ids are deterministic
 * ({@link PndThreadAttachmentInput}), and Agent Builder's create route answers `409` for a duplicate
 * id, so a conflict means the attachment is already there — exactly the answer a retry wants. This
 * is the platform-side half of D6's idempotency: even if the pre-read and the in-flight map both
 * missed, the attachment set cannot grow past three.
 *
 * Created **serially**, on purpose. Every create reads the conversation, mutates its `attachments`
 * array and writes the whole conversation back (`client.update`), so three concurrent creates would
 * race on one document and the last write would drop the other two.
 */
export const createThreadAttachments = async ({
  attachments,
  conversationId,
  http,
  logger,
  request,
  spaceId,
}: CreateThreadAttachmentsParams): Promise<CreateThreadAttachmentsResult> => {
  const path = buildAgentBuilderAttachmentsPath(conversationId);

  const outcomes = await attachments.reduce<Promise<Array<{ id: string; present: boolean }>>>(
    async (previous, attachment) => {
      const settled = await previous;

      try {
        const { status } = await scopedSelfPost({
          body: { ...attachment },
          http,
          path,
          request,
          spaceId,
          version: AGENT_BUILDER_API_VERSION,
        });

        const present = (status >= 200 && status < 300) || status === 409;

        if (!present) {
          logger.warn(
            `Failed to attach "${attachment.id}" to PND thread "${conversationId}" in space "${spaceId}": Agent Builder answered ${status}. The thread exists; the Attachments tab will be missing this artifact.`
          );
        }

        return [...settled, { id: attachment.id, present }];
      } catch (error) {
        logger.warn(
          `Failed to attach "${
            attachment.id
          }" to PND thread "${conversationId}" in space "${spaceId}": ${
            error instanceof Error ? error.message : String(error)
          }. The thread exists; the Attachments tab will be missing this artifact.`
        );
        return [...settled, { id: attachment.id, present: false }];
      }
    },
    Promise.resolve([])
  );

  return {
    missing: outcomes.filter(({ present }) => !present).map(({ id }) => id),
    present: outcomes.filter(({ present }) => present).map(({ id }) => id),
  };
};
