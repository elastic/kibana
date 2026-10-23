/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
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

/** `run_id` plus the optional `report_id` that every envelope state carries. */
export const envelopeBase = (runId: string, reportId?: string) => ({
  run_id: runId,
  ...(reportId ? { report_id: reportId } : {}),
});

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
  logger,
}: StoreTarget & { runId: string; reportId?: string; logger: Logger }): Promise<void> => {
  const data: HuntCoordinatorResultAttachment = {
    ...envelopeBase(runId, reportId),
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
    // Only a repeated start for the same run and Investigation gets here: the Worker starts one
    // child per report per execution, and the id is derived from the run id alone. If the
    // earlier run is still going, both pipelines write this attachment and the last writer wins.
    logger.warn(
      `hunt_coordinator: result attachment ${attachmentId} already existed and was reset to running; a start for the same run and Investigation is being repeated`
    );
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
