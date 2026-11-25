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
  INTERNAL_V1_HEADERS,
  RULE_TUNING_REVIEW_WORKFLOW_ID,
  type RuleTuningSpaceArgs,
} from './common';

const getExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<WorkflowExecutionDto> => {
  const response = await apiClient.get(
    spaceUrl(`api/workflows/executions/${executionId}?includeOutput=true`, spaceId),
    { headers, responseType: 'json' }
  );
  expectStatus(`Read execution ${executionId}`, response);
  return response.body as WorkflowExecutionDto;
};

/**
 * The review the worker started in the space. The space holds one rule, so the worker starts
 * one review.
 */
export const waitForReviewExecution = ({
  apiClient,
  headers,
  spaceId,
  timeoutMs,
}: RuleTuningSpaceArgs & { timeoutMs: number }): Promise<string> =>
  pollFor(
    'the worker to start a rule tuning review',
    async () => {
      const response = await apiClient.get(
        spaceUrl(`api/workflows/workflow/${RULE_TUNING_REVIEW_WORKFLOW_ID}/executions`, spaceId),
        { headers, responseType: 'json' }
      );
      expectStatus('List the review executions', response);
      const [review] = (response.body as { results?: Array<{ id: string }> }).results ?? [];
      return review?.id;
    },
    { timeoutMs }
  );

/** The id of the investigation conversation the review opened. */
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
      if (isTerminalStatus(execution.status)) {
        throw new Error(
          `Review ${executionId} ended ${
            execution.status
          } before it opened an investigation: ${JSON.stringify(execution.error)}`
        );
      }
      const output = execution.stepExecutions.find(
        ({ stepId, output: stepOutput }) => stepId === 'create_investigation' && stepOutput != null
      )?.output as { conversation_id?: string } | undefined;
      return output?.conversation_id;
    },
    { timeoutMs }
  );

/**
 * Approves or dismisses the pending proposal of the investigation, the same way the analyst's
 * buttons do, and returns its id. A proposal can be listed before its gate has parked, and the
 * route answers 409 until it has, so a 409 is retried.
 *
 * In manual mode the entry proposal and the tuning proposal share the investigation, and a
 * decided proposal can still list as pending for a moment, so `decidedIds` are skipped.
 */
export const decidePendingProposal = ({
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
}): Promise<string> =>
  pollFor(
    `a pending proposal in conversation ${conversationId} to ${decision}`,
    async () => {
      const listed = await apiClient.get(
        spaceUrl(
          `internal/proposals?conversationId=${encodeURIComponent(conversationId)}&status=pending`,
          spaceId
        ),
        { headers: { ...headers, ...INTERNAL_V1_HEADERS }, responseType: 'json' }
      );
      expectStatus('List the pending proposals', listed);
      const proposal = (listed.body as { proposals: Array<{ id: string }> }).proposals.find(
        ({ id }) => !decidedIds.includes(id)
      );
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
      if (decided.statusCode === 409) {
        return undefined;
      }
      expectStatus(`${decision} proposal ${proposal.id}`, decided);
      return proposal.id;
    },
    { timeoutMs }
  );

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
