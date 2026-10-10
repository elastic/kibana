/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus } from '@kbn/workflows';
import { isReviewAtApprovalGate } from './workflow_task';

const CONVERSATION_ID = 'conv-1';

const review = (status: ExecutionStatus, conversationId: string | null = CONVERSATION_ID) => ({
  status,
  stepExecutions: [
    { stepId: 'fetch_rule', output: { rule_id: 'r1' } },
    ...(conversationId
      ? [{ stepId: 'create_investigation', output: { conversation_id: conversationId } }]
      : []),
  ] as never,
});

const fetchWithProposals = (proposals: Array<{ id: string }>) =>
  jest.fn().mockResolvedValue({ proposals }) as unknown as jest.MockedFunction<HttpHandler>;

describe('isReviewAtApprovalGate', () => {
  // Since #294745 the gate lives in system-create-proposal, two executions below the review,
  // so a review parked on a human decision reports waiting_for_child (smoke g6smk7).
  it('recognises a waiting_for_child review that owns a pending proposal', async () => {
    const fetch = fetchWithProposals([{ id: 'p1' }]);

    await expect(
      isReviewAtApprovalGate({ fetch, review: review(ExecutionStatus.WAITING_FOR_CHILD) })
    ).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      '/internal/proposals',
      expect.objectContaining({ query: { conversationId: CONVERSATION_ID, status: 'pending' } })
    );
  });

  it('does not treat a bare waiting_for_child review (no pending proposal) as approval-ready', async () => {
    const fetch = fetchWithProposals([]);

    await expect(
      isReviewAtApprovalGate({ fetch, review: review(ExecutionStatus.WAITING_FOR_CHILD) })
    ).resolves.toBe(false);
  });

  it('does not treat a waiting_for_child review without an investigation conversation as ready', async () => {
    const fetch = fetchWithProposals([{ id: 'p1' }]);

    await expect(
      isReviewAtApprovalGate({
        fetch,
        review: review(ExecutionStatus.WAITING_FOR_CHILD, null),
      })
    ).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps accepting the direct gate statuses without a proposals lookup', async () => {
    const fetch = fetchWithProposals([]);

    await expect(
      isReviewAtApprovalGate({ fetch, review: review(ExecutionStatus.WAITING_FOR_INPUT) })
    ).resolves.toBe(true);
    await expect(
      isReviewAtApprovalGate({ fetch, review: review(ExecutionStatus.WAITING) })
    ).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores a pending proposal on a review that is not parked', async () => {
    const fetch = fetchWithProposals([{ id: 'p1' }]);

    for (const status of [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.COMPLETED,
    ]) {
      await expect(isReviewAtApprovalGate({ fetch, review: review(status) })).resolves.toBe(false);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
