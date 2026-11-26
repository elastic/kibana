/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PROPOSALS_INTERNAL_URL,
  type ApproveProposalRequest,
  type DismissProposalRequest,
} from '@kbn/proposals-common';
import type { ExecutionStatus, WorkflowExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { pollFor, spaceUrl } from '../helpers';
import { waitForExecution } from '../workflow_runs';
import {
  expectStatus,
  findStepOutputObject,
  INTERNAL_V1_HEADERS,
  isTransientStatus,
  RULE_TUNING_REVIEW_WORKFLOW_ID,
  type RuleTuningSpaceArgs,
} from './common';

/** The execution, or undefined while its status is transient. */
const getExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<WorkflowExecutionDto | undefined> => {
  const response = await apiClient.get<WorkflowExecutionDto>(
    spaceUrl(`api/workflows/executions/${executionId}?includeOutput=true`, spaceId),
    { headers, responseType: 'json' }
  );
  if (isTransientStatus(response.statusCode)) {
    return undefined;
  }
  expectStatus(`Read execution ${executionId}`, response);
  return response.body;
};

/** Waits for the review the worker starts in the space, and returns its execution id. */
export const waitForReviewExecution = ({
  apiClient,
  headers,
  spaceId,
  timeoutMs,
}: RuleTuningSpaceArgs & { timeoutMs: number }): Promise<string> =>
  pollFor(
    'the worker to start a rule tuning review',
    async () => {
      const response = await apiClient.get<{ results?: Array<{ id: string }> }>(
        spaceUrl(`api/workflows/workflow/${RULE_TUNING_REVIEW_WORKFLOW_ID}/executions`, spaceId),
        { headers, responseType: 'json' }
      );
      if (isTransientStatus(response.statusCode)) {
        return undefined;
      }
      expectStatus('List the review executions', response);
      const reviews = response.body.results ?? [];
      // The space holds one rule, so a second review means the test would follow the wrong one.
      if (reviews.length > 1) {
        throw new Error(`Expected one rule tuning review, found ${reviews.length}`);
      }
      return reviews[0]?.id;
    },
    { timeoutMs }
  );

/** Waits for the review to open its investigation, and returns the conversation id. */
export const waitForInvestigation = ({
  apiClient,
  headers,
  spaceId,
  executionId,
  timeoutMs,
}: RuleTuningSpaceArgs & { executionId: string; timeoutMs: number }): Promise<string> =>
  pollFor(
    `review ${executionId} to open its investigation`,
    async () => {
      const execution = await getExecution({ apiClient, headers, spaceId, executionId });
      if (!execution) {
        return undefined;
      }
      if (isTerminalStatus(execution.status)) {
        throw new Error(
          `Review ${executionId} ended ${
            execution.status
          } before it opened an investigation: ${JSON.stringify(execution.error)}`
        );
      }
      const conversationId = findStepOutputObject(
        execution,
        'create_investigation'
      )?.conversation_id;
      return typeof conversationId === 'string' ? conversationId : undefined;
    },
    { timeoutMs }
  );

/** Approves or dismisses the investigation's next pending proposal, and returns its id. */
export const decidePendingProposal = async ({
  apiClient,
  headers,
  spaceId,
  conversationId,
  decision,
  decidedIds = [],
  timeoutMs,
}: RuleTuningSpaceArgs & {
  conversationId: string;
  decision: 'approve' | 'dismiss';
  decidedIds?: string[];
  timeoutMs: number;
}): Promise<string> => {
  let lastConflict: string | undefined;
  try {
    return await pollFor(
      `a pending proposal in conversation ${conversationId} to ${decision}`,
      async () => {
        const listed = await apiClient.get<{ proposals: Array<{ id: string }> }>(
          spaceUrl(
            `${PROPOSALS_INTERNAL_URL}?conversationId=${encodeURIComponent(
              conversationId
            )}&status=pending`,
            spaceId
          ),
          { headers: { ...headers, ...INTERNAL_V1_HEADERS }, responseType: 'json' }
        );
        if (isTransientStatus(listed.statusCode)) {
          return undefined;
        }
        expectStatus('List the pending proposals', listed);
        // In manual mode the entry proposal and the tuning proposal share the investigation, and
        // a decided proposal can still list as pending for a moment.
        const proposal = listed.body.proposals.find(({ id }) => !decidedIds.includes(id));
        if (!proposal) {
          return undefined;
        }
        const body: ApproveProposalRequest | DismissProposalRequest =
          decision === 'approve' ? {} : { dismissReason: 'no_reason' };
        const decided = await apiClient.post(
          spaceUrl(
            `${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(proposal.id)}/${decision}`,
            spaceId
          ),
          { headers: { ...headers, ...INTERNAL_V1_HEADERS }, responseType: 'json', body }
        );
        // A proposal can list before the review has parked at its gate, and the route answers
        // 409 until it has.
        if (decided.statusCode === 409) {
          lastConflict = JSON.stringify(decided.body);
          return undefined;
        }
        expectStatus(`${decision} proposal ${proposal.id}`, decided);
        return proposal.id;
      },
      { timeoutMs }
    );
  } catch (error) {
    if (lastConflict === undefined) {
      throw error;
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}. Last 409: ${lastConflict}`
    );
  }
};

/**
 * Waits for the review the worker starts, decides its proposals in order, and returns the review
 * once it ended. In manual mode the first decision answers the entry gate, which the analyst sees
 * before any diagnosis, and the second answers the tuning proposal.
 */
export const driveReview = async ({
  apiClient,
  headers,
  spaceId,
  decisions,
  stepTimeoutMs,
  decisionTimeoutMs = stepTimeoutMs,
}: RuleTuningSpaceArgs & {
  decisions: Array<'approve' | 'dismiss'>;
  /** Budget of the review's start, its investigation and its end. */
  stepTimeoutMs: number;
  /** Budget of each decision, which waits for the proposal to exist. Defaults to a step. */
  decisionTimeoutMs?: number;
}): Promise<WorkflowExecutionDto> => {
  const space = { apiClient, headers, spaceId };
  const executionId = await waitForReviewExecution({ ...space, timeoutMs: stepTimeoutMs });
  const conversationId = await waitForInvestigation({
    ...space,
    executionId,
    timeoutMs: stepTimeoutMs,
  });
  const decidedIds: string[] = [];
  for (const decision of decisions) {
    decidedIds.push(
      await decidePendingProposal({
        ...space,
        conversationId,
        decision,
        decidedIds,
        timeoutMs: decisionTimeoutMs,
      })
    );
  }
  return waitForExecution(apiClient, headers, executionId, stepTimeoutMs, spaceId);
};

const cancelExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<void> => {
  const response = await apiClient.post(
    spaceUrl(`api/workflows/executions/${executionId}/cancel`, spaceId),
    { headers, responseType: 'json' }
  );
  expectStatus(`Cancel review ${executionId}`, response);
};

/**
 * Cancels the reviews of the space that are still running. A failure to list or to cancel is an
 * error, because a review parked at its gate would stay active after its space is deleted.
 */
export const cancelReviews = async ({
  apiClient,
  headers,
  spaceId,
}: RuleTuningSpaceArgs): Promise<void> => {
  const response = await apiClient.get<{
    results?: Array<{ id: string; status: ExecutionStatus }>;
  }>(spaceUrl(`api/workflows/workflow/${RULE_TUNING_REVIEW_WORKFLOW_ID}/executions`, spaceId), {
    headers,
    responseType: 'json',
  });
  expectStatus('List the review executions', response);
  for (const { id, status } of response.body.results ?? []) {
    if (!isTerminalStatus(status)) {
      await cancelExecution({ apiClient, headers, spaceId, executionId: id });
    }
  }
};
