/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveProposal, ProposalSlot } from './resolve_proposal_slot';
import { computeExpectedProposalCount, resolveProposals } from './settle_proposals';

const SPACE = 'default';
const THIS_RUN = 'conv-this';

const live = (overrides: Partial<LiveProposal> = {}): LiveProposal => ({
  proposalId: 'live-head',
  conversationId: 'conv-other',
  title: 'Isolate host A',
  comment: 'Isolate host A.',
  revision: 1,
  revisable: true,
  ...overrides,
});

const candidate = (subjectKey: string, extra: Record<string, unknown> = {}) => ({
  subjectKey,
  actionInput: { endpoint_ids: [subjectKey] },
  title: `Isolate ${subjectKey}`,
  ...extra,
});

const deps = ({
  slots = {},
  existing = 0,
  outcome = 'revised',
}: {
  slots?: Record<string, ProposalSlot>;
  existing?: number | Error;
  outcome?: Awaited<
    ReturnType<Parameters<typeof resolveProposals>[0]['deps']['appendAlsoRaisedBy']>
  >;
} = {}) => ({
  countExistingProposals: jest.fn(async () => {
    if (existing instanceof Error) {
      throw existing;
    }
    return existing;
  }),
  resolveProposalSlot: jest.fn(async ({ subjectKey }: { subjectKey: string }) => {
    const slot = slots[subjectKey];
    if (!slot) {
      throw new Error(`no slot for ${subjectKey}`);
    }
    return slot;
  }),
  appendAlsoRaisedBy: jest.fn(async () => outcome),
});

describe('resolveProposals', () => {
  it('mints a free subject under the id its slot gave, keeping the rest of the proposal', async () => {
    const d = deps({ slots: { a: { kind: 'mint', proposalId: 'id-a' } }, existing: 2 });

    const result = await resolveProposals({
      candidates: [candidate('a', { comment: 'why' })],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result.proposals).toEqual([
      { ...candidate('a', { comment: 'why' }), proposalId: 'id-a' },
    ]);
    expect(result.converged).toEqual([]);
    expect(result.alreadyOpenCount).toBe(0);
    expect(result.existingProposalCount).toBe(2);
    expect(result.expectedProposalCount).toBe(3);
    expect(result.mintSuppression).toBe('none');
    expect(d.resolveProposalSlot).toHaveBeenCalledWith({
      subjectKey: 'a',
      actionInput: { endpoint_ids: ['a'] },
    });
    expect(d.appendAlsoRaisedBy).not.toHaveBeenCalled();
  });

  it('converges a held subject: creates nothing, adds this Investigation to it, says where it went', async () => {
    const d = deps({ slots: { a: { kind: 'converge', live: live() } } });

    const result = await resolveProposals({
      candidates: [candidate('a')],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result.proposals).toEqual([]);
    expect(result.converged).toEqual([
      {
        title: 'Isolate a',
        proposalId: 'live-head',
        ownerConversationId: 'conv-other',
        outcome: 'revised',
        note: expect.stringContaining('This Investigation was added to it.'),
      },
    ]);
    expect(d.appendAlsoRaisedBy).toHaveBeenCalledWith({
      live: live(),
      investigationConversationId: THIS_RUN,
    });
    // Nothing minted, so the barrier is the baseline alone.
    expect(result.expectedProposalCount).toBe(0);
  });

  it('only counts a subject this Investigation already holds', async () => {
    const d = deps({
      slots: { a: { kind: 'converge', live: live({ conversationId: THIS_RUN }) } },
      outcome: 'same_investigation',
    });

    const result = await resolveProposals({
      candidates: [candidate('a')],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result.converged).toEqual([]);
    expect(result.alreadyOpenCount).toBe(1);
  });

  it('settles each candidate proposal on its own', async () => {
    const d = deps({
      slots: {
        a: { kind: 'mint', proposalId: 'id-a' },
        b: { kind: 'converge', live: live({ title: 'Isolate b' }) },
        c: { kind: 'mint', proposalId: 'id-c' },
      },
      existing: 1,
    });

    const result = await resolveProposals({
      candidates: [candidate('a'), candidate('b'), candidate('c')],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result.proposals.map(({ proposalId }) => proposalId)).toEqual(['id-a', 'id-c']);
    expect(result.converged.map(({ title }) => title)).toEqual(['Isolate b']);
    expect(result.expectedProposalCount).toBe(3);
  });

  // The one case this must not mishandle: minting when it cannot tell what exists could
  // duplicate a Proposal an analyst is deciding on.
  it('fails closed when the existing count cannot be read', async () => {
    const d = deps({
      slots: { a: { kind: 'mint', proposalId: 'id-a' } },
      existing: new Error('503'),
    });

    const result = await resolveProposals({
      candidates: [candidate('a')],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result).toEqual({
      proposals: [],
      converged: [],
      alreadyOpenCount: 0,
      alreadyOpenSubjectKeys: [],
      existingProposalCount: 0,
      expectedProposalCount: 0,
      mintSuppression: 'check_failed',
    });
    expect(d.resolveProposalSlot).not.toHaveBeenCalled();
  });

  it('fails closed when any slot cannot be resolved, even after others were', async () => {
    const d = deps({ slots: { a: { kind: 'mint', proposalId: 'id-a' } }, existing: 4 });

    const result = await resolveProposals({
      candidates: [candidate('a'), candidate('missing')],
      investigationConversationId: THIS_RUN,
      spaceId: SPACE,
      deps: d,
    });

    expect(result.proposals).toEqual([]);
    expect(result.mintSuppression).toBe('check_failed');
    expect(result.expectedProposalCount).toBe(0);
  });
});

describe('computeExpectedProposalCount', () => {
  it('adds what this run mints to what the Investigation already carried', () => {
    expect(
      computeExpectedProposalCount({
        mintSuppression: 'none',
        existingProposalCount: 3,
        newProposalCount: 2,
      })
    ).toBe(5);
  });

  it('is zero when minting was suppressed, since no gate of this run will run', () => {
    expect(
      computeExpectedProposalCount({
        mintSuppression: 'check_failed',
        existingProposalCount: 3,
        newProposalCount: 2,
      })
    ).toBe(0);
  });
});
