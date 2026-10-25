/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFpClosureConverger } from './converge_fp_closure';
import type { LiveProposal } from './resolve_proposal_slot';

const live = (overrides: Partial<LiveProposal> = {}): LiveProposal => ({
  proposalId: 'prop-1',
  conversationId: 'conv-1',
  title: 'Close alerts as false positive',
  comment: 'Initial',
  revision: 1,
  revisable: true,
  ...overrides,
});

describe('createFpClosureConverger', () => {
  it('unions alert ids into actionInput on revise', async () => {
    const revise = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue({
      actionInput: { alertIds: ['a1'], reason: 'false_positive' },
      comment: 'Initial',
    });
    const converge = createFpClosureConverger({
      proposalsService: { revise, get, getLatestRevision: jest.fn() } as never,
      privileges: { canManage: async () => true },
      spaceId: 'default',
      request: {} as never,
    });

    const result = await converge({ live: live(), alertIds: ['a2', 'a1'] });
    expect(result.outcome).toBe('revised');
    expect(result.alertIds).toEqual(['a1', 'a2']);
    expect(revise).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prop-1',
        actionInput: expect.objectContaining({
          alertIds: ['a1', 'a2'],
          reason: 'false_positive',
        }),
      }),
      'default',
      expect.anything()
    );
  });

  it('refuses when the proposal is not revisable', async () => {
    const converge = createFpClosureConverger({
      proposalsService: { revise: jest.fn(), get: jest.fn(), getLatestRevision: jest.fn() } as never,
      privileges: { canManage: async () => true },
      spaceId: 'default',
      request: {} as never,
    });
    await expect(
      converge({ live: live({ revisable: false }), alertIds: ['a1'] })
    ).resolves.toEqual({ outcome: 'not_revisable', alertIds: ['a1'] });
  });
});
