/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { HuntContinueResponse } from '../../common/hunt_library';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { HUNT_LABEL_OWNER_ID } from './execution_labels';
import { launchManualSession, MANUAL_SESSION_IMMUTABLE_LABEL_KEYS } from './manual_session';
import { getHuntDefinition } from './seed';
import { readHuntSessionAttachment } from './session_attachment_store';

export type HuntContinueErrorCode =
  | 'investigation_inaccessible'
  | 'no_hunt_session'
  | 'definition_changed';

/** The Investigation cannot be continued as a hunt. Nothing was started. */
export class HuntContinueError extends Error {
  constructor(public readonly code: HuntContinueErrorCode, message: string) {
    super(message);
    this.name = 'HuntContinueError';
  }
}

/**
 * Reopens a hunt from an Investigation. A manual session resumes at its latest saved Discover state.
 * An automated one that no human has extended yet opens at the hunt's initial query, columns and the
 * window the automated run used. Either way a fresh session is recorded, and the session records
 * the Investigation id, so evidence the analyst preserves next lands on the same
 * Investigation. The session execution is recreated when the original expired under retention.
 */
export const continueHuntSession = async ({
  management,
  request,
  conversations,
  attachments,
  logger,
  spaceId,
  investigationId,
  newSessionId = uuidv4(),
}: {
  management: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  conversations: Pick<ConversationPublicClient, 'get'>;
  attachments: Pick<AttachmentPublicClient, 'get'>;
  logger: Logger;
  spaceId: string;
  investigationId: string;
  newSessionId?: string;
}): Promise<HuntContinueResponse> => {
  try {
    await conversations.get(investigationId);
  } catch {
    throw new HuntContinueError(
      'investigation_inaccessible',
      'You cannot access this Investigation.'
    );
  }

  const session = await readHuntSessionAttachment({ attachments, conversationId: investigationId });
  if (!session) {
    throw new HuntContinueError('no_hunt_session', 'This Investigation has no hunt to continue.');
  }

  const definition = getHuntDefinition(session.definition.id);
  if (!definition || definition.version !== session.definition.version) {
    throw new HuntContinueError('definition_changed', 'This hunt changed since it was run.');
  }

  const { executionId, sessionId } = await launchManualSession({
    client: management,
    request,
    spaceId,
    definition,
    sessionId: newSessionId,
    logger,
  });

  // Link the session to the Investigation so the evidence it preserves lands there.
  await management.updateExecutionLabels({
    executionId,
    spaceId,
    workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
    labelOwnerId: HUNT_LABEL_OWNER_ID,
    labels: { 'hunt.investigation_id': investigationId },
    immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
  });

  // The saved Discover state of the latest manual work, if a human has worked it.
  const resume = session.resumeSnapshot;

  return {
    session_id: sessionId,
    execution_id: executionId,
    investigation_id: investigationId,
    definition_id: definition.id,
    profile_token: executionId,
    resume: resume
      ? {
          query: resume.query,
          filters: resume.filters,
          time_range: resume.timeRange,
          columns: resume.columns,
          data_view_id: resume.dataViewId,
        }
      : {
          query: definition.query.query,
          filters: [],
          time_range: session.adjudication?.executionWindow ?? definition.query.defaultTimeRange,
          columns: [...definition.query.recommendedColumns],
          data_view_id: '',
        },
  };
};
