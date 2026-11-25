/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { pollFor, spaceUrl } from '../helpers';
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
            `internal/proposals?conversationId=${encodeURIComponent(
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
        const decided = await apiClient.post(
          spaceUrl(`internal/proposals/${encodeURIComponent(proposal.id)}/${decision}`, spaceId),
          {
            headers: { ...headers, ...INTERNAL_V1_HEADERS },
            responseType: 'json',
            body: decision === 'approve' ? {} : { dismissReason: 'no_reason' },
          }
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

/** Cancels the execution, and succeeds when it already ended. */
export const cancelExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<void> => {
  await apiClient.post(spaceUrl(`api/workflows/executions/${executionId}/cancel`, spaceId), {
    headers,
  });
};
