/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import { buildProposalId } from './proposal_id';
import { createProposalSlotResolver } from './resolve_proposal_slot';

const SPACE = 'default';
const SUBJECT = 'subject-key-1';
const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const request = httpServerMock.createKibanaRequest();

const idAt = (generation: number, spaceId = SPACE) =>
  buildProposalId({ spaceId, subjectKey: SUBJECT, generation });

interface Chain {
  status: 'pending' | 'executing' | 'succeeded' | 'failed' | 'no_action' | 'expired';
  decision?: 'approved' | 'dismissed';
  expiresAt?: string;
  conversationId?: string;
  /** Set when the chain was revised: the live head is this row, not the root. */
  headId?: string;
  /** What the live revision acts on. */
  actionInput?: Record<string, unknown>;
  /** Overrides the revision number the fake would derive from `headId`. */
  revision?: number;
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
        revision: entry.revision ?? (entry.headId ? 2 : 1),
        status: entry.status,
        decision: entry.decision,
        actionInput: entry.actionInput,
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

const THIS_RUN = 'conv-this';
const transient = () => Object.assign(new Error('unavailable'), { statusCode: 503 });

const resolver = (
  service: ReturnType<typeof createService>,
  overrides: {
    spaceId?: string;
    assertCanRead?: () => Promise<void>;
    isInvestigationOpen?: (conversationId: string) => Promise<boolean>;
  } = {}
) => {
  const logger = loggerMock.create();
  const privileges = { assertCanRead: jest.fn(overrides.assertCanRead ?? (async () => undefined)) };
  const isInvestigationOpen = jest.fn(overrides.isInvestigationOpen ?? (async () => true));
  const sleep = jest.fn(async () => undefined);
  return {
    logger,
    privileges,
    isInvestigationOpen,
    sleep,
    resolve: createProposalSlotResolver({
      proposalsService: service as never,
      privileges,
      isInvestigationOpen,
      investigationConversationId: THIS_RUN,
      spaceId: overrides.spaceId ?? SPACE,
      request,
      logger,
      now: () => NOW,
      retry: { sleep },
    }),
  };
};

describe('createProposalSlotResolver', () => {
  it('mints at generation zero when nothing holds the subject', async () => {
    const { resolve } = resolver(createService());

    await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
      kind: 'mint',
      proposalId: idAt(0),
    });
  });

  describe('a live proposal holds the subject', () => {
    it('converges onto a proposal still awaiting a decision, which can be revised', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', conversationId: 'conv-1' } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
        kind: 'converge',
        live: {
          proposalId: idAt(0),
          conversationId: 'conv-1',
          title: 'Isolate host A',
          comment: `Comment of ${idAt(0)}`,
          revision: 1,
          revisable: true,
        },
      });
    });

    it('converges onto an approved one without offering to revise it: a decided proposal cannot be', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', decision: 'approved' } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({
        kind: 'converge',
        live: { revisable: false },
      });
    });

    it('converges onto one whose action is running', async () => {
      const service = createService({ [idAt(0)]: { status: 'executing', decision: 'approved' } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: idAt(0), revisable: false },
      });
    });

    it('converges onto the live revision, not the superseded root', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', headId: 'revision-2' } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: 'revision-2', comment: 'Comment of revision-2' },
      });
    });

    it('still converges while the deadline has not passed', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', expiresAt: '2026-10-09T12:00:01.000Z' },
      });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
    });
  });

  describe('a settled proposal does not hold the subject', () => {
    it.each(['succeeded', 'failed', 'no_action', 'expired'] as const)(
      'moves to the next generation when the last one settled as %s',
      async (status) => {
        const { resolve } = resolver(createService({ [idAt(0)]: { status } }));

        await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
          kind: 'mint',
          proposalId: idAt(1),
        });
      }
    );

    it('converges onto a live proposal further along', async () => {
      const service = createService({
        [idAt(0)]: { status: 'no_action', decision: 'dismissed' },
        [idAt(1)]: { status: 'expired' },
        [idAt(2)]: { status: 'pending', conversationId: 'conv-3' },
      });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({
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

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
        kind: 'mint',
        proposalId: idAt(1),
      });
    });

    it('does not apply the deadline to an executing proposal, which keeps running past it', async () => {
      const service = createService({
        [idAt(0)]: { status: 'executing', expiresAt: '2026-10-09T11:00:00.000Z' },
      });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
    });
  });

  describe('a live proposal revised to act on something else', () => {
    // `revise()` merges new action input over the old without touching the chain, so a proposal
    // created for one host can be revised to target another and still sit under the first's id.
    const forHost = (agent: string) => ({ endpoint_ids: [agent], comment: 'original' });

    it('does not hold the subject once its target has changed: the finding gets its own proposal', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', headId: 'revision-2', actionInput: forHost('agent-b') },
      });
      const { resolve } = resolver(service);

      await expect(
        resolve({ subjectKey: SUBJECT, actionInput: forHost('agent-a') })
      ).resolves.toEqual({ kind: 'mint', proposalId: idAt(1) });
    });

    it('still holds it when only something other than the target was revised', async () => {
      const service = createService({
        [idAt(0)]: {
          status: 'pending',
          headId: 'revision-2',
          actionInput: { endpoint_ids: ['agent-a'], comment: 'revised by an analyst' },
        },
      });
      const { resolve } = resolver(service);

      await expect(
        resolve({ subjectKey: SUBJECT, actionInput: forHost('agent-a') })
      ).resolves.toMatchObject({ kind: 'converge', live: { proposalId: 'revision-2' } });
    });

    it('converges onto a later generation that does match, past the revised-away one', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', actionInput: forHost('agent-b') },
        [idAt(1)]: { status: 'pending', actionInput: forHost('agent-a'), conversationId: 'conv-2' },
      });
      const { resolve } = resolver(service);

      await expect(
        resolve({ subjectKey: SUBJECT, actionInput: forHost('agent-a') })
      ).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: idAt(1), conversationId: 'conv-2' },
      });
    });

    it.each([
      [
        'a process',
        { endpoint_ids: ['agent-a'], parameters: { entity_id: 'ent-1' } },
        { endpoint_ids: ['agent-a'], parameters: { entity_id: 'ent-2' } },
      ],
      [
        'a process by pid',
        { endpoint_ids: ['agent-a'], parameters: { pid: 4242 } },
        { endpoint_ids: ['agent-a'], parameters: { pid: 4343 } },
      ],
    ])('compares what %s is identified by', async (_label, wanted, revisedTo) => {
      const service = createService({ [idAt(0)]: { status: 'pending', actionInput: revisedTo } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT, actionInput: wanted })).resolves.toEqual({
        kind: 'mint',
        proposalId: idAt(1),
      });
      // And the same input is the same target.
      const same = createService({ [idAt(0)]: { status: 'pending', actionInput: wanted } });
      await expect(
        resolver(same).resolve({ subjectKey: SUBJECT, actionInput: wanted })
      ).resolves.toMatchObject({ kind: 'converge' });
    });

    it('ignores the pid when the entity id selects the process', async () => {
      const service = createService({
        [idAt(0)]: {
          status: 'pending',
          actionInput: { endpoint_ids: ['agent-a'], parameters: { entity_id: 'e1' } },
        },
      });
      const { resolve } = resolver(service);

      await expect(
        resolve({
          subjectKey: SUBJECT,
          actionInput: { endpoint_ids: ['agent-a'], parameters: { entity_id: 'e1', pid: 4242 } },
        })
      ).resolves.toMatchObject({ kind: 'converge', live: { proposalId: idAt(0) } });
    });

    it('holds a finding that carries no action input, like the recommendation', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', actionInput: forHost('agent-b') },
      });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
    });

    it('does not read the proposal itself for one it has already ruled out', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', actionInput: forHost('agent-b') },
      });
      const { resolve } = resolver(service);

      await resolve({ subjectKey: SUBJECT, actionInput: forHost('agent-a') });

      expect(service.get).not.toHaveBeenCalled();
    });
  });

  describe('a live proposal whose Investigation has been closed', () => {
    // A Proposal on a closed Investigation is one the analyst cannot see: converging a finding
    // onto it would hide the finding.
    it('does not hold the subject: the finding gets a proposal of its own', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', conversationId: 'conv-closed' },
      });
      const { resolve, isInvestigationOpen } = resolver(service, {
        isInvestigationOpen: async (id) => id !== 'conv-closed',
      });

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
        kind: 'mint',
        proposalId: idAt(1),
      });
      expect(isInvestigationOpen).toHaveBeenCalledWith('conv-closed');
    });

    it('converges onto an open one further along', async () => {
      const service = createService({
        [idAt(0)]: { status: 'pending', conversationId: 'conv-closed' },
        [idAt(1)]: { status: 'pending', conversationId: 'conv-open' },
      });
      const { resolve } = resolver(service, {
        isInvestigationOpen: async (id) => id === 'conv-open',
      });

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({
        kind: 'converge',
        live: { proposalId: idAt(1), conversationId: 'conv-open' },
      });
    });

    it('is not asked about this run’s own Investigation, which is the one being packaged', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', conversationId: THIS_RUN } });
      const { resolve, isInvestigationOpen } = resolver(service, {
        isInvestigationOpen: async () => false,
      });

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
      expect(isInvestigationOpen).not.toHaveBeenCalled();
    });

    it('is not asked about a proposal that was already ruled out', async () => {
      const service = createService({
        [idAt(0)]: { status: 'succeeded', conversationId: 'conv-x' },
      });
      const { resolve, isInvestigationOpen } = resolver(service);

      await resolve({ subjectKey: SUBJECT });

      expect(isInvestigationOpen).not.toHaveBeenCalled();
    });

    it('fails closed when it cannot tell whether the Investigation is open', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', conversationId: 'conv-x' } });
      const { resolve } = resolver(service, {
        isInvestigationOpen: async () => {
          throw new Error('conversations unavailable');
        },
      });

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('conversations unavailable');
    });
  });

  describe('the privilege to read proposals', () => {
    it('is checked for the request before anything is read', async () => {
      const service = createService();
      const { resolve, privileges } = resolver(service);

      await resolve({ subjectKey: SUBJECT });

      expect(privileges.assertCanRead).toHaveBeenCalledWith(request);
      expect(privileges.assertCanRead.mock.invocationCallOrder[0]).toBeLessThan(
        service.getLatestRevision.mock.invocationCallOrder[0]
      );
    });

    it('is checked once per run, however many findings it resolves', async () => {
      const { resolve, privileges } = resolver(createService());

      await resolve({ subjectKey: SUBJECT });
      await resolve({ subjectKey: 'another-subject' });
      await resolve({ subjectKey: 'a-third' });

      expect(privileges.assertCanRead).toHaveBeenCalledTimes(1);
    });

    it('reads nothing, and copies nothing from another Investigation, when it is refused', async () => {
      // `get` hands back another Investigation's title and comment, which end up in this
      // Investigation's journal.
      const service = createService({ [idAt(0)]: { status: 'pending' } });
      const { resolve } = resolver(service, {
        assertCanRead: async () => {
          throw new Error('forbidden');
        },
      });

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('forbidden');
      expect(service.getLatestRevision).not.toHaveBeenCalled();
      expect(service.get).not.toHaveBeenCalled();
    });

    it('is retried when the check itself is throttled, since it goes to Elasticsearch', async () => {
      const assertCanRead = jest
        .fn()
        .mockRejectedValueOnce(transient())
        .mockResolvedValue(undefined);
      const { resolve, sleep } = resolver(createService(), { assertCanRead });

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'mint' });
      expect(assertCanRead).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
    });

    it('does not remember a check that is still failing, so the next finding asks again', async () => {
      // A blip must not lose the whole run: it fails closed and is not retried by the next sweep.
      const assertCanRead = jest
        .fn()
        .mockRejectedValueOnce(transient())
        .mockRejectedValueOnce(transient())
        .mockRejectedValueOnce(transient())
        .mockResolvedValue(undefined);
      const { resolve } = resolver(createService(), { assertCanRead });

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('unavailable');
      await expect(resolve({ subjectKey: 'another-subject' })).resolves.toMatchObject({
        kind: 'mint',
      });
      expect(assertCanRead).toHaveBeenCalledTimes(4);
    });

    it('remembers a grant for the rest of the run', async () => {
      const assertCanRead = jest.fn().mockResolvedValue(undefined);
      const { resolve } = resolver(createService(), { assertCanRead });

      await resolve({ subjectKey: SUBJECT });
      await resolve({ subjectKey: 'another-subject' });

      expect(assertCanRead).toHaveBeenCalledTimes(1);
    });

    it('does not retry a real refusal', async () => {
      const assertCanRead = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }));
      const { resolve } = resolver(createService(), { assertCanRead });

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('forbidden');
      expect(assertCanRead).toHaveBeenCalledTimes(1);
    });

    it('stays refused for every later finding in the run', async () => {
      const { resolve, privileges } = resolver(createService(), {
        assertCanRead: async () => {
          throw new Error('forbidden');
        },
      });

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('forbidden');
      await expect(resolve({ subjectKey: 'another-subject' })).rejects.toThrow('forbidden');
      expect(privileges.assertCanRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('a read that fails in a way a second try could pass', () => {
    it('is retried, so one throttled request does not lose a run its findings', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending' } });
      service.getLatestRevision.mockRejectedValueOnce(transient());
      const { resolve, sleep } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
      expect(service.getLatestRevision).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
    });

    it('is retried when it is reading the live proposal itself', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending' } });
      service.get.mockRejectedValueOnce(transient());
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
      expect(service.get).toHaveBeenCalledTimes(2);
    });

    it('is retried when it is asking whether an Investigation is open', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending', conversationId: 'conv-x' } });
      const isInvestigationOpen = jest
        .fn()
        .mockRejectedValueOnce(transient())
        .mockResolvedValue(true);
      const { resolve } = resolver(service, { isInvestigationOpen });

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toMatchObject({ kind: 'converge' });
      expect(isInvestigationOpen).toHaveBeenCalledTimes(2);
    });

    it('still fails closed once the retries are spent', async () => {
      const service = createService();
      service.getLatestRevision.mockRejectedValue(transient());
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('unavailable');
      expect(service.getLatestRevision).toHaveBeenCalledTimes(3);
    });

    it('does not retry a refusal', async () => {
      const service = createService();
      service.getLatestRevision.mockRejectedValue(
        Object.assign(new Error('forbidden'), { statusCode: 403 })
      );
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('forbidden');
      expect(service.getLatestRevision).toHaveBeenCalledTimes(1);
    });

    it('does not retry "nothing there", which is an answer', async () => {
      const service = createService();
      const { resolve, sleep } = resolver(service);

      await resolve({ subjectKey: SUBJECT });

      expect(service.getLatestRevision).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  });

  describe('scoping', () => {
    it('looks in its own space, and a proposal in another space does not hold the subject', async () => {
      const service = createService({ [idAt(0, 'other')]: { status: 'pending' } });
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).resolves.toEqual({
        kind: 'mint',
        proposalId: idAt(0),
      });
      expect(service.getLatestRevision).toHaveBeenCalledWith(idAt(0), SPACE);
    });
  });

  describe('when it cannot tell', () => {
    it('throws, and does not mint, on a lookup failure that is not "not found"', async () => {
      const service = createService();
      service.getLatestRevision.mockRejectedValue(new Error('cluster unavailable'));
      const { resolve, logger } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('cluster unavailable');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });

    it('throws on a failure reading the live proposal itself', async () => {
      const service = createService({ [idAt(0)]: { status: 'pending' } });
      service.get.mockRejectedValue(new Error('read failed'));
      const { resolve } = resolver(service);

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow('read failed');
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

      await expect(resolve({ subjectKey: SUBJECT })).rejects.toThrow(
        /settled proposals under one subject/
      );
      expect(service.getLatestRevision).toHaveBeenCalledTimes(50);
    });
  });
});
