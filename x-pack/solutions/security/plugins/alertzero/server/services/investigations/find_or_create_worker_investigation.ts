/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  agentBuilderDefaultAgentId,
  ConversationAccessControlMode,
  isConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import type { FindOrCreateWorkerInvestigationResponse } from '@kbn/alertzero-common';
import { buildWorkerInvestigationConversationId } from './worker_investigation_id';
import type { WorkerInvestigationSubject } from './worker_investigation_id';

export type FindOrCreateWorkerInvestigationOutput = FindOrCreateWorkerInvestigationResponse;

/**
 * Narrow slice of `ConversationPublicClient` this needs (the client injected at the call
 * site is the public, camelCase wrapper), kept separate from the real type so the logic
 * below is testable without mocking the full client.
 */
export interface FindOrCreateWorkerInvestigationConversationClient {
  create: (request: {
    id: string;
    agentId: string;
    title: string;
    templateId: string;
    accessControl: { access_mode: ConversationAccessControlMode; entries: never[] };
    metadata?: Record<string, MetadataFieldValue>;
  }) => Promise<unknown>;
  get: (conversationId: string) => Promise<{ metadata?: Record<string, MetadataFieldValue> }>;
  patchMetadata: (
    conversationId: string,
    updates: Record<string, MetadataFieldValue>,
    options?: { access?: 'owner' | 'converse' }
  ) => Promise<{ changedFields: readonly string[] }>;
}

export interface FindOrCreateWorkerInvestigationInput extends WorkerInvestigationSubject {
  /** Title of the Investigation when this call creates it. A reused one keeps its title. */
  title: string;
  /** Written on create and refreshed on reuse, so it always describes the latest review. */
  description?: string;
  /** Execution id of the calling review, recorded whether the call created or reused. */
  workflowExecutionId?: string;
}

export interface RunFindOrCreateWorkerInvestigationDeps {
  conversationClient: FindOrCreateWorkerInvestigationConversationClient;
  logger?: Logger;
  /**
   * Told once this call has reopened a closed Investigation, for telemetry. Best-effort: an
   * error it throws is logged and never fails the find-or-create.
   */
  onReopened?: (investigationConversationId: string) => void;
}

const readExecutionIds = (metadata: Record<string, MetadataFieldValue> | undefined): string[] => {
  const ids = metadata?.workflow_execution_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
};

/**
 * Brings an Investigation an earlier review left behind up to date with this review.
 *
 * `status` is reset to `open` when the earlier review closed it: the review that is about to
 * run proposes on this Investigation, and a proposal on a closed Investigation is one nobody
 * is looking at. Only `status` is reset. `close_reason` is a SELECT with no value meaning
 * "not closed", so a reopened Investigation keeps the reason it was last closed with, as the
 * Hunt Watch reopen does.
 *
 * The description is refreshed and the calling run is appended to `workflow_execution_ids`
 * in the same write, so the Investigation names every review that worked on it.
 *
 * `converse` access rather than the default `owner`: the Investigation is public precisely
 * so it belongs to whoever is on duty rather than to the identity that minted it.
 */
const resumeExisting = async (
  conversationClient: FindOrCreateWorkerInvestigationConversationClient,
  investigationConversationId: string,
  metadata: Record<string, MetadataFieldValue> | undefined,
  {
    description,
    workflowExecutionId,
  }: Pick<FindOrCreateWorkerInvestigationInput, 'description' | 'workflowExecutionId'>
): Promise<{ reopened: boolean }> => {
  const updates: Record<string, MetadataFieldValue> = {};
  // Absent or empty reads as open in the investigation template, so there is nothing to reopen.
  const wasClosed = metadata?.status === 'closed';
  if (wasClosed) {
    updates.status = 'open';
  }
  if (description !== undefined && metadata?.description !== description) {
    updates.description = description;
  }
  if (workflowExecutionId !== undefined) {
    const executionIds = readExecutionIds(metadata);
    if (!executionIds.includes(workflowExecutionId)) {
      updates.workflow_execution_ids = [...executionIds, workflowExecutionId];
    }
  }
  if (Object.keys(updates).length === 0) {
    return { reopened: false };
  }
  const { changedFields } = await conversationClient.patchMetadata(
    investigationConversationId,
    updates,
    { access: 'converse' }
  );
  // A concurrent reopen that won the race leaves this write nothing to change on `status`.
  return { reopened: wasClosed && changedFields.includes('status') };
};

/**
 * Mints the deterministic Investigation id for a Worker's subject and creates the
 * conversation, or resumes the one an earlier review opened. A 409 from the create is the
 * reuse path: the existing conversation is read back to confirm it is reachable, reopened
 * if the earlier review closed it, and stamped with this review's execution id. `created`
 * tells the caller which path ran, so a re-review can say it resumed the Investigation
 * instead of claiming to have opened it.
 */
export const runFindOrCreateWorkerInvestigation = async (
  {
    spaceId,
    workerId,
    subjectId,
    title,
    description,
    workflowExecutionId,
  }: FindOrCreateWorkerInvestigationInput,
  { conversationClient, logger, onReopened }: RunFindOrCreateWorkerInvestigationDeps
): Promise<FindOrCreateWorkerInvestigationOutput> => {
  const investigationConversationId = buildWorkerInvestigationConversationId({
    spaceId,
    workerId,
    subjectId,
  });

  let created = true;
  let reopened = false;
  try {
    await conversationClient.create({
      id: investigationConversationId,
      agentId: agentBuilderDefaultAgentId,
      title,
      templateId: TEMPLATE_ID_INVESTIGATION,
      // A Worker-minted Investigation belongs to whichever analyst is on duty, not to the
      // identity the workflow happened to execute as; the client default is private.
      accessControl: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      metadata: {
        status: 'open',
        ...(description !== undefined ? { description } : {}),
        ...(workflowExecutionId !== undefined
          ? { workflow_execution_ids: [workflowExecutionId] }
          : {}),
      },
    });
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) {
      throw error;
    }
    created = false;
    const existing = await conversationClient.get(investigationConversationId);
    // Deliberately not swallowed. Without an Investigation id the review has nowhere to
    // propose, so a failure here fails the review and leaves the subject for the next sweep.
    // Continuing instead would propose on an Investigation this call knows is closed.
    ({ reopened } = await resumeExisting(
      conversationClient,
      investigationConversationId,
      existing.metadata,
      {
        description,
        workflowExecutionId,
      }
    ));
    if (reopened) {
      logger?.debug(
        `findOrCreateWorkerInvestigation: reopened Investigation ${investigationConversationId} for ${workerId} subject ${subjectId}, which an earlier review had closed.`
      );
      try {
        onReopened?.(investigationConversationId);
      } catch (reportError) {
        logger?.debug(
          `findOrCreateWorkerInvestigation: could not report the reopen of ${investigationConversationId}: ${
            reportError instanceof Error ? reportError.message : String(reportError)
          }`
        );
      }
    }
  }

  return { investigationConversationId, created, reopened };
};
