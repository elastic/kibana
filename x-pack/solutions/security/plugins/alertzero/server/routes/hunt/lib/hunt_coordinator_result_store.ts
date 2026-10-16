/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import {
  isAttachmentAlreadyExistsError,
  isConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../../common/constants';
import type { HuntCoordinatorResultAttachment } from '../../../../common/hunt_coordinator_result_attachment_schema';

export const HUNT_COORDINATOR_RESULT_ATTACHMENT_DESCRIPTION = 'Hunt coordinator result (internal)';

interface StoreTarget {
  client: AttachmentPublicClient;
  conversationId: string;
  attachmentId: string;
}

/**
 * Creates the hidden `running` placeholder the hunt child polls. Called before the route
 * answers, so a conversation that cannot be written fails the request instead of leaving the
 * child polling an attachment that never appears.
 *
 * A run id that was already used (a rerun of the same sweep id, or a placeholder a prior
 * attempt left behind) is refreshed in place rather than rejected: the hunt child reads by id,
 * so an existing record must carry this run's state, not the previous one's. Any other error
 * is the caller's to map.
 */
export const writeRunning = async ({
  client,
  conversationId,
  attachmentId,
  runId,
  reportId,
}: StoreTarget & { runId: string; reportId?: string }): Promise<void> => {
  const data: HuntCoordinatorResultAttachment = {
    run_id: runId,
    ...(reportId ? { report_id: reportId } : {}),
    state: 'running',
  };
  try {
    await client.create({
      conversationId,
      id: attachmentId,
      type: ALERTZERO_ATTACHMENT_TYPES.huntCoordinatorResult,
      data,
      description: HUNT_COORDINATOR_RESULT_ATTACHMENT_DESCRIPTION,
      hidden: true,
      readonly: true,
    });
  } catch (error) {
    if (!isAttachmentAlreadyExistsError(error)) {
      throw error;
    }
    await client.update({ conversationId, attachmentId, data });
  }
};

/**
 * Moves the placeholder to its terminal envelope once the detached pipeline has finished.
 * The write goes through the conversation document, so a concurrent writer on the same
 * Investigation (the hunt child attaching an SSE, an analyst message) can race it; one
 * retry covers that. Anything else is rethrown for the caller to log.
 */
export const writeTerminal = async ({
  client,
  conversationId,
  attachmentId,
  envelope,
}: StoreTarget & {
  envelope: Extract<HuntCoordinatorResultAttachment, { state: 'completed' | 'failed' }>;
}): Promise<void> => {
  try {
    await client.update({ conversationId, attachmentId, data: envelope });
  } catch (error) {
    if (!isConversationWriteConflictError(error)) {
      throw error;
    }
    await client.update({ conversationId, attachmentId, data: envelope });
  }
};
