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
  isConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { ConversationPermissions, MetadataFieldValue } from '@kbn/agent-builder-common';
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
    /** Omitted for an Investigation Agent Builder mints a random id for. */
    id?: string;
    agentId: string;
    title: string;
    templateId: string;
    accessControl: { access_mode: ConversationAccessControlMode; entries: never[] };
    metadata?: Record<string, MetadataFieldValue>;
  }) => Promise<{ id: string }>;
  get: (conversationId: string) => Promise<{
    metadata?: Record<string, MetadataFieldValue>;
    template_id?: string;
    permissions?: Pick<ConversationPermissions, 'update_access_control'>;
  }>;
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
   * error it throws or rejects with is logged and never fails the find-or-create.
   */
  onReopened?: (investigationConversationId: string) => void | Promise<void>;
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
  // Appended to the list this call read, so two calls resuming the same Investigation at
  // once would each write a list without the other's id. The review workflows never do:
  // each keeps one review per subject in flight through its concurrency key, and the
  // subject is what the id derives from, so no two calls share an Investigation.
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

type ExistingConversation = Awaited<
  ReturnType<FindOrCreateWorkerInvestigationConversationClient['get']>
>;

/**
 * Why the conversation at the derived id is not one this Worker can review on, or `undefined`
 * when it is. Agent Builder lets any caller create a conversation under an id of their
 * choosing, and every input to the derived id is public, so an existing conversation at it
 * is not by itself one of this Worker's. The checks that are available today: it can be
 * read, it is on the Investigation template, and the Worker owns it. Only the owner may
 * change a conversation's access control, so `update_access_control` is the owner check.
 */
const whyNotReusable = (existing: ExistingConversation): string | undefined => {
  if (existing.template_id !== TEMPLATE_ID_INVESTIGATION) {
    return `it is not an Investigation (template: ${existing.template_id ?? 'none'})`;
  }
  if (existing.permissions?.update_access_control !== true) {
    return 'the Worker does not own it';
  }
  return undefined;
};

/** Creates the Worker's Investigation for a subject, or resumes the one an earlier review opened. */
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
  const create = (id: string | undefined) =>
    conversationClient.create({
      ...(id !== undefined ? { id } : {}),
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

  try {
    await create(investigationConversationId);
    return { investigationConversationId, created: true, reopened: false };
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) {
      throw error;
    }
  }

  // Something sits at the derived id. Reuse it only when it is this Worker's own
  // Investigation. Otherwise the review runs on a fresh Investigation with a random id, as
  // every review did before the id was derived: the subject then gets one Investigation per
  // review rather than failing on every sweep. That also means a Worker whose service
  // account changed does not reuse the Investigations the earlier account minted.
  let existing: ExistingConversation | undefined;
  try {
    existing = await conversationClient.get(investigationConversationId);
  } catch (error) {
    if (!isConversationNotFoundError(error)) {
      throw error;
    }
  }
  const reason = existing === undefined ? 'the Worker cannot read it' : whyNotReusable(existing);
  if (existing === undefined || reason !== undefined) {
    logger?.warn(
      `findOrCreateWorkerInvestigation: conversation ${investigationConversationId} exists but ${reason}; reviewing ${workerId} subject ${subjectId} on a fresh Investigation instead`
    );
    const fallback = await create(undefined);
    return { investigationConversationId: fallback.id, created: true, reopened: false };
  }

  // Deliberately not swallowed. Without an Investigation id the review has nowhere to
  // propose, so a failure here fails the review and leaves the subject for the next sweep.
  // Continuing instead would propose on an Investigation this call knows is closed.
  const { reopened } = await resumeExisting(
    conversationClient,
    investigationConversationId,
    existing.metadata,
    { description, workflowExecutionId }
  );
  if (reopened) {
    logger?.debug(
      `findOrCreateWorkerInvestigation: reopened Investigation ${investigationConversationId} for ${workerId} subject ${subjectId}, which an earlier review had closed.`
    );
    // Not awaited: the Investigation is already open, and a report that stalls (the route
    // checks the run against workflows management first) must not hold up the review's step.
    Promise.resolve()
      .then(() => onReopened?.(investigationConversationId))
      .catch((reportError) => {
        logger?.debug(
          `findOrCreateWorkerInvestigation: could not report the reopen of ${investigationConversationId}: ${
            reportError instanceof Error ? reportError.message : String(reportError)
          }`
        );
      });
  }

  return { investigationConversationId, created: false, reopened };
};
