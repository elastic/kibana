/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { HuntContinueResponse } from '../../common/hunt_library';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { launchManualSession } from './manual_session';
import type { HuntProfileTokenSigner } from './profile_token';
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
 * window the automated run used. Either way a fresh session is recorded, and the signed state it
 * returns carries the Investigation id, so evidence the analyst preserves next lands on the same
 * Investigation. The session execution is recreated when the original expired under retention.
 */
export const continueHuntSession = async ({
  management,
  request,
  conversations,
  attachments,
  signer,
  logger,
  spaceId,
  investigationId,
  newSessionId = uuidv4(),
}: {
  management: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  conversations: Pick<ConversationPublicClient, 'get'>;
  attachments: Pick<AttachmentPublicClient, 'get'>;
  signer: HuntProfileTokenSigner;
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

  // The saved Discover state of the latest manual work, if a human has worked it.
  const resume = session.resumeSnapshot;

  return {
    session_id: sessionId,
    execution_id: executionId,
    investigation_id: investigationId,
    definition_id: definition.id,
    profile_token: signer.issue({
      spaceId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      sessionId,
      sessionExecutionId: executionId,
      investigationId,
    }),
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
