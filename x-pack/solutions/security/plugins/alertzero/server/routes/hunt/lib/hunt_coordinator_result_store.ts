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
import type {
  HuntCoordinatorResultAttachment,
  HuntCoordinatorResultTerminalAttachment,
} from '../../../../common/hunt_coordinator_result_attachment_schema';

export const HUNT_COORDINATOR_RESULT_ATTACHMENT_DESCRIPTION = 'Hunt coordinator result (internal)';

interface StoreTarget {
  client: AttachmentPublicClient;
  conversationId: string;
  attachmentId: string;
}

/** Creates or refreshes the hidden `running` placeholder before the route answers. */
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

/** Writes the terminal envelope; retries once on a conversation write conflict. */
export const writeTerminal = async ({
  client,
  conversationId,
  attachmentId,
  envelope,
}: StoreTarget & { envelope: HuntCoordinatorResultTerminalAttachment }): Promise<void> => {
  try {
    await client.update({ conversationId, attachmentId, data: envelope });
  } catch (error) {
    if (!isConversationWriteConflictError(error)) {
      throw error;
    }
    await client.update({ conversationId, attachmentId, data: envelope });
  }
};
