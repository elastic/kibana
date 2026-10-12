/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import { buildHuntProposalId } from '../common/hunt_proposal_id';
import { createProposalSlotResolver } from './resolve_proposal_slot';

const SPACE = 'default';
const SUBJECT = 'subject-key-1';
const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const request = httpServerMock.createKibanaRequest();

const idAt = (generation: number, spaceId = SPACE) =>
  buildHuntProposalId({ spaceId, subjectKey: SUBJECT, generation });

interface Chain {
  status: 'pending' | 'executing' | 'succeeded' | 'failed' | 'no_action' | 'expired';
  decision?: 'approved' | 'dismissed';
  expiresAt?: string;
  conversationId?: string;
  /** Set when the chain was revised: the live head is this row, not the root. */
  headId?: string;
}

/** A Proposals service fake: chains keyed by the id of their root, one per generation. */
const createService = (chains: Record<string, Chain> = {}) => {
  const heads = new Map<string, Chain & { rootId: string }>();
  Object.entries(chains).forEach(([rootId, chain]) =>
    heads.set(chain.headId ?? rootId, { ...chain, rootId })
  );
  const service = {
    getLatestRevision: jest.fn(async (id: string) => {
      const entry = chains[id];
      if (!entry) {
        throw new ProposalNotFoundError(id);
      }
      return {
        proposalId: entry.headId ?? id,
        revision: entry.headId ? 2 : 1,
        status: entry.status,
        decision: entry.decision,
        actionInput: undefined,
      };
    }),
    get: jest.fn(async (id: string) => {
      const head = heads.get(id);
      if (!head) {
        throw new ProposalNotFoundError(id);
      }
      return {
        id,
        conversationId: head.conversationId ?? 'conv-owner',
        title: 'Isolate host A',
        comment: `Comment of ${id}`,
        status: head.status,
        expiresAt: head.expiresAt,
      };
    }),
  };
  return service;
};

const resolver = (service: ReturnType<typeof createService>, spaceId = SPACE) => {
  const logger = loggerMock.create();
  return {
    logger,
    resolve: createProposalSlotResolver({
      proposalsService: service as never,
      spaceId,
      request,
      logger,
      now: () => NOW,
    }),
  };
};

describe('createProposalSlotResolver', () => {
  it('mints at generation zero when nothing holds the subject', async () => {
    const { resolve } = resolver(createService());

    await expect(resolve(SUBJECT)).resolves.toEqual({ kind: 'mint', proposalId: idAt(0) });
  });

  describe('a live proposal holds the subject', () => {
    it('converges onto a proposal still awaiting a decision, which can be revised', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', conversationId: 'conv-1' } });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toEqual({
        kind: 'converge',
        live: {
          proposalId: idAt(0),
          conversationId: 'conv-1',
          title: 'Isolate host A',
          comment: `Comment of ${idAt(0)}`,
          revisable: true,
        },
      });
    });

    it('converges onto an approved one without offering to revise it: a decided proposal cannot be', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', decision: 'approved' } });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({
        kind: 'converge',
        live: { revisable: false },
      });
    });

    it('converges onto one whose action is running', async () => {
      const service = createService({ [idAt(0)]: { status: 'executing', decision: 'approved' } });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: idAt(0), revisable: false },
      });
    });

    it('converges onto the live revision, not the superseded root', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', headId: 'revision-2' } });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: 'revision-2', comment: 'Comment of revision-2' },
      });
    });

    it('still converges while the deadline has not passed', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', expiresAt: '2026-10-09T12:00:01.000Z' },
      });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({ kind: 'converge' });
    });
  });

  describe('a settled proposal does not hold the subject', () => {
    it.each(['succeeded', 'failed', 'no_action', 'expired'] as const)(
      'moves to the next generation when the last one settled as %s',
      async (status) => {
        const { resolve } = resolver(createService({ [idAt(0)]: { status } }));

        await expect(resolve(SUBJECT)).resolves.toEqual({ kind: 'mint', proposalId: idAt(1) });
      }
    );

    it('converges onto a live proposal further along', async () => {
      const service = createService({
        [idAt(0)]: { status: 'no_action', decision: 'dismissed' },
        [idAt(1)]: { status: 'expired' },
        [idAt(2)]: { status: 'pending', conversationId: 'conv-3' },
      });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: idAt(2), conversationId: 'conv-3' },
      });
    });

    it('treats a pending proposal past its deadline as settled, even before its gate records the expiry', async () => {
      // Converging a new finding onto something that is about to expire would lose it.
      const service = createService({
        [idAt(0)]: { status: 'pending', expiresAt: '2026-10-09T11:59:59.000Z' },
      });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toEqual({ kind: 'mint', proposalId: idAt(1) });
    });

    it('does not apply the deadline to an executing proposal, which keeps running past it', async () => {
      const service = createService({
        [idAt(0)]: { status: 'executing', expiresAt: '2026-10-09T11:00:00.000Z' },
      });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toMatchObject({ kind: 'converge' });
    });
  });

  describe('scoping', () => {
    it('looks in its own space, and a proposal in another space does not hold the subject', async () => {
      const service = createService({ [idAt(0, 'other')]: { status: 'pending' } });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).resolves.toEqual({ kind: 'mint', proposalId: idAt(0) });
      expect(service.getLatestRevision).toHaveBeenCalledWith(idAt(0), SPACE);
    });
  });

  describe('when it cannot tell', () => {
    it('throws, and does not mint, on a lookup failure that is not "not found"', async () => {
      const service = createService();
      service.getLatestRevision.mockRejectedValue(new Error('cluster unavailable'));
      const { resolve, logger } = resolver(service);

      await expect(resolve(SUBJECT)).rejects.toThrow('cluster unavailable');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });

    it('throws on a failure reading the live proposal itself', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending' } });
      service.get.mockRejectedValue(new Error('read failed'));
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).rejects.toThrow('read failed');
    });

    it('gives up rather than mint without bound once every generation has settled', async () => {
      const service = createService();
      service.getLatestRevision.mockResolvedValue({
        proposalId: 'x',
        revision: 1,
        status: 'succeeded',
        decision: 'approved',
        actionInput: undefined,
      });
      const { resolve } = resolver(service);

      await expect(resolve(SUBJECT)).rejects.toThrow(/settled proposals under one subject/);
      expect(service.getLatestRevision).toHaveBeenCalledTimes(50);
    });
  });
});
