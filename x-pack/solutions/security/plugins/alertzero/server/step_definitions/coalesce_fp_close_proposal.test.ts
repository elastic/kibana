/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coalesceFpCloseProposalStepDefinition } from './coalesce_fp_close_proposal';
import { MAX_FP_CLOSE_ALERT_IDS, MAX_FP_CLOSE_REVISIONS } from './fp_close_proposal';
import {
  createProposalsMock,
  createStepContext,
  FAKE_REQUEST,
  pendingFpCloseProposal,
  storedPointer,
} from './test_helpers';

const mockStore = { get: jest.fn(), write: jest.fn() };
jest.mock('../rule_dispositions/fp_open_pointer_store', () => ({
  createFpOpenPointerStore: () => mockStore,
}));

const INPUT = {
  rule_id: 'rule-1',
  conversation_id: 'conv-batch',
  fp_candidate_ids: ['c', 'd', 'c'],
  rule_name: 'Noisy rule',
  confidence_floor: 0.85,
};

const MINT = { output: { mode: 'mint', added_count: 2, total_count: 2 } };

const namedError = (name: string) => Object.assign(new Error(name), { name });

const setup = ({ isPointerStoreAvailable = true } = {}) => {
  const proposals = createProposalsMock();
  const { context, logger } = createStepContext(INPUT);
  const run = () =>
    coalesceFpCloseProposalStepDefinition({
      getProposals: proposals.getProposals,
      isPointerStoreAvailable,
      pollDelayMs: 0,
      reviseConflictDelayMs: 0,
      appendRetryDelayMs: 0,
    }).handler(context);
  return { ...proposals, logger, run };
};

/** The pending head the pointer leads to, as `list` and `getLatestRevision` report it. */
const withPendingHead = (
  service: ReturnType<typeof createProposalsMock>['service'],
  alertIds: string[],
  revision = 1
) => {
  service.list.mockResolvedValue({
    proposals: [pendingFpCloseProposal('fp-1', alertIds, revision)],
    total: 1,
  });
  service.getLatestRevision.mockResolvedValue({
    proposalId: 'fp-1',
    revision,
    status: 'pending',
    actionInput: { alertIds, reason: 'false_positive' },
  });
};

describe('coalesceFpCloseProposalStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.get.mockResolvedValue(undefined);
    mockStore.write.mockResolvedValue('written');
  });

  it('asks for a new proposal without the Context Engine, and writes no pointer', async () => {
    const { run } = setup({ isPointerStoreAvailable: false });

    await expect(run()).resolves.toEqual(MINT);
    expect(mockStore.get).not.toHaveBeenCalled();
    expect(mockStore.write).not.toHaveBeenCalled();
  });

  it("claims the rule's pointer for this batch when the rule has none", async () => {
    const { run } = setup();

    await expect(run()).resolves.toEqual(MINT);
    expect(mockStore.write).toHaveBeenCalledWith(
      { ruleId: 'rule-1', conversationId: 'conv-batch', reviewExecutionId: 'review-exec-2' },
      undefined
    );
  });

  it('adds the batch to the pending proposal, sending the whole de-duplicated union', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service, privileges } = setup();
    withPendingHead(service, ['a', 'b', 'c']);
    service.revise.mockResolvedValue({ proposalId: 'fp-2', revision: 2 });

    await expect(run()).resolves.toEqual({
      output: {
        mode: 'appended',
        proposal_id: 'fp-2',
        standing_conversation_id: 'conv-standing',
        added_count: 1,
        total_count: 4,
      },
    });
    expect(privileges.assertCanManage).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(service.revise).toHaveBeenCalledWith(
      {
        id: 'fp-1',
        actionInput: { alertIds: ['a', 'b', 'c', 'd'], reason: 'false_positive' },
        comment: expect.stringContaining('4 alerts from rule "Noisy rule" were classified'),
      },
      'space-a',
      FAKE_REQUEST
    );
    expect(mockStore.write).not.toHaveBeenCalled();
  });

  it('does not revise when the proposal already holds every alert of the batch', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['c', 'd']);

    await expect(run()).resolves.toEqual({
      output: {
        mode: 'appended',
        proposal_id: 'fp-1',
        standing_conversation_id: 'conv-standing',
        added_count: 0,
        total_count: 2,
      },
    });
    expect(service.revise).not.toHaveBeenCalled();
  });

  it('raises a new proposal when the pending one would grow past the cap', async () => {
    const stored = storedPointer();
    mockStore.get.mockResolvedValue(stored);
    const { run, service } = setup();
    withPendingHead(
      service,
      Array.from({ length: MAX_FP_CLOSE_ALERT_IDS - 1 }, (_, index) => `alert-${index}`)
    );

    await expect(run()).resolves.toEqual(MINT);
    expect(service.revise).not.toHaveBeenCalled();
    expect(mockStore.write).toHaveBeenCalledWith(expect.anything(), stored);
  });

  it('raises a new proposal when the pending one has used its revisions', async () => {
    const stored = storedPointer();
    mockStore.get.mockResolvedValue(stored);
    const { run, service } = setup();
    withPendingHead(service, ['a'], MAX_FP_CLOSE_REVISIONS);

    await expect(run()).resolves.toEqual(MINT);
    expect(service.revise).not.toHaveBeenCalled();
    expect(mockStore.write).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-batch' }),
      stored
    );
  });

  it('still adds to the pending proposal one revision short of the limit', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['a'], MAX_FP_CLOSE_REVISIONS - 1);
    service.revise.mockResolvedValue({ proposalId: 'fp-2', revision: MAX_FP_CLOSE_REVISIONS });

    await expect(run()).resolves.toEqual({
      output: expect.objectContaining({ mode: 'appended', proposal_id: 'fp-2' }),
    });
  });

  it('reports a batch already on a proposal that has used its revisions as appended', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['c', 'd'], MAX_FP_CLOSE_REVISIONS);

    await expect(run()).resolves.toEqual({
      output: expect.objectContaining({ mode: 'appended', added_count: 0, total_count: 2 }),
    });
    expect(service.revise).not.toHaveBeenCalled();
  });

  it('replaces a stale pointer without waiting when its proposal was decided long ago', async () => {
    const stored = storedPointer();
    mockStore.get.mockResolvedValue(stored);
    const { run, service } = setup();

    await expect(run()).resolves.toEqual(MINT);
    expect(service.list).toHaveBeenCalled();
    expect(mockStore.write).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-batch' }),
      stored
    );
  });

  it('waits for a proposal another review is still raising, then adds to it', async () => {
    mockStore.get.mockResolvedValue(storedPointer({ updatedAt: new Date().toISOString() }));
    const { run, service } = setup();
    withPendingHead(service, ['a']);
    service.list.mockResolvedValueOnce({ proposals: [], total: 0 });
    service.revise.mockResolvedValue({ proposalId: 'fp-2', revision: 2 });

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ output: expect.objectContaining({ mode: 'appended' }) })
    );
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('gives up waiting after a few polls and raises its own proposal', async () => {
    mockStore.get.mockResolvedValue(storedPointer({ updatedAt: new Date().toISOString() }));
    const { run, service } = setup();

    await expect(run()).resolves.toEqual(MINT);
    expect(service.list.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('raises a new proposal when the pending one expires under it', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['a']);
    service.revise.mockRejectedValue(namedError('ProposalExpiredError'));
    service.getLatestRevision.mockResolvedValue({
      proposalId: 'fp-1',
      revision: 1,
      status: 'expired',
      actionInput: { alertIds: ['a'] },
    });

    await expect(run()).resolves.toEqual(MINT);
    expect(mockStore.write).toHaveBeenCalled();
  });

  it('re-reads after losing the pointer write and joins the winner', async () => {
    mockStore.get
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(storedPointer({ conversationId: 'conv-winner' }));
    mockStore.write.mockResolvedValueOnce('conflict');
    const { run, service } = setup();
    withPendingHead(service, ['a']);
    service.revise.mockResolvedValue({ proposalId: 'fp-2', revision: 2 });

    await expect(run()).resolves.toEqual({
      output: expect.objectContaining({
        mode: 'appended',
        standing_conversation_id: 'conv-winner',
      }),
    });
  });

  it('raises a proposal of its own after losing the pointer write twice', async () => {
    mockStore.write.mockResolvedValue('conflict');
    const { run, logger } = setup();

    await expect(run()).resolves.toEqual(MINT);
    expect(mockStore.write).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('reports appended when revise conflicts but the batch is already on the proposal', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['c', 'd']);
    service.revise.mockRejectedValue(namedError('ProposalConflictError'));

    await expect(run()).resolves.toEqual({
      output: {
        mode: 'appended',
        proposal_id: 'fp-1',
        standing_conversation_id: 'conv-standing',
        added_count: 0,
        total_count: 2,
      },
    });
    expect(service.revise).not.toHaveBeenCalled();
  });

  it('re-reads the head and revises again when a concurrent batch revised it first', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['a']);
    service.getLatestRevision
      .mockResolvedValueOnce({
        proposalId: 'fp-1',
        revision: 1,
        status: 'pending',
        actionInput: { alertIds: ['a'] },
      })
      .mockResolvedValueOnce({
        proposalId: 'fp-2',
        revision: 2,
        status: 'pending',
        actionInput: { alertIds: ['a', 'e'] },
      });
    service.revise
      .mockRejectedValueOnce(namedError('ProposalConflictError'))
      .mockResolvedValueOnce({ proposalId: 'fp-3', revision: 3 });

    await expect(run()).resolves.toEqual({
      output: expect.objectContaining({ mode: 'appended', proposal_id: 'fp-3', total_count: 4 }),
    });
    expect(service.revise).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'fp-2',
        actionInput: { alertIds: ['a', 'e', 'c', 'd'], reason: 'false_positive' },
      }),
      'space-a',
      FAKE_REQUEST
    );
    expect(mockStore.write).not.toHaveBeenCalled();
  });

  it('fails the step instead of claiming the pointer when appending keeps losing the race', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service, logger } = setup();
    withPendingHead(service, ['a']);
    service.revise.mockRejectedValue(namedError('ProposalConflictError'));

    await expect(run()).rejects.toThrow('could not be appended after retries');
    expect(mockStore.write).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('fails the step instead of claiming the pointer when the proposals service errors', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service } = setup();
    withPendingHead(service, ['a']);
    service.revise.mockRejectedValue(new Error('es unavailable'));

    await expect(run()).rejects.toThrow('es unavailable');
    expect(mockStore.write).not.toHaveBeenCalled();
  });

  it('fails the step with a warning when the Worker identity may not revise proposals', async () => {
    mockStore.get.mockResolvedValue(storedPointer());
    const { run, service, privileges, logger } = setup();
    withPendingHead(service, ['a']);
    privileges.assertCanManage.mockRejectedValue(new Error('forbidden'));

    await expect(run()).rejects.toThrow('forbidden');
    expect(service.revise).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });
});
