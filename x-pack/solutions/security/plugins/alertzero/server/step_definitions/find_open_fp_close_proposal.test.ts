/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findOpenFpCloseProposalStepDefinition } from './find_open_fp_close_proposal';
import { MAX_FP_CLOSE_ALERT_IDS } from './fp_close_proposal';
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

const setup = ({ isPointerStoreAvailable = true } = {}) => {
  const proposals = createProposalsMock();
  const run = () =>
    findOpenFpCloseProposalStepDefinition({
      getProposals: proposals.getProposals,
      isPointerStoreAvailable,
    }).handler(createStepContext({ rule_id: 'rule-1' }).context);
  return { ...proposals, run };
};

describe('findOpenFpCloseProposalStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.get.mockResolvedValue(storedPointer());
  });

  it('finds nothing without the Context Engine, so the Worker opens an Investigation', async () => {
    const { run, service } = setup({ isPointerStoreAvailable: false });

    await expect(run()).resolves.toEqual({ output: { found: false } });
    expect(mockStore.get).not.toHaveBeenCalled();
    expect(service.list).not.toHaveBeenCalled();
  });

  it('finds nothing when the rule has no pointer', async () => {
    mockStore.get.mockResolvedValue(undefined);
    const { run, service } = setup();

    await expect(run()).resolves.toEqual({ output: { found: false } });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("returns the Investigation holding the rule's pending closure proposal", async () => {
    const { run, service, privileges } = setup();
    service.list.mockResolvedValue({
      proposals: [
        { id: 'tuning-1', actionWorkflowId: 'system-alertzero-action-tune-rule' },
        pendingFpCloseProposal('fp-1', ['a', 'b']),
      ],
      total: 2,
    });

    await expect(run()).resolves.toEqual({
      output: {
        found: true,
        conversation_id: 'conv-standing',
        proposal_id: 'fp-1',
        alert_count: 2,
      },
    });
    expect(privileges.assertCanRead).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-standing',
        status: 'pending',
        excludeSuperseded: true,
        excludeExpired: true,
      }),
      'space-a',
      FAKE_REQUEST,
      expect.anything()
    );
  });

  it('finds nothing when the pointed-to proposal was already decided or expired', async () => {
    const { run } = setup();

    await expect(run()).resolves.toEqual({ output: { found: false } });
  });

  it('finds nothing when the pending proposal cannot take more alerts', async () => {
    const { run, service } = setup();
    const full = Array.from({ length: MAX_FP_CLOSE_ALERT_IDS }, (_, index) => `alert-${index}`);
    service.list.mockResolvedValue({ proposals: [pendingFpCloseProposal('fp-1', full)], total: 1 });

    await expect(run()).resolves.toEqual({ output: { found: false } });
  });
});
