/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { RESOLVE_PROPOSALS_STEP_ID } from '../../../common/step_types/resolve_proposals';
import {
  buildProposalSubjectKey,
  createAlsoRaisedByAppender,
  createExistingProposalsCounter,
  createInvestigationOpenChecker,
  createProposalSlotResolver,
  resolveProposals,
} from '../../services/proposals/dedup';
import { getResolveProposalsStepDefinition, keyCandidateProposals } from './resolve_proposals_step';

jest.mock('../../services/proposals/dedup', () => ({
  ...jest.requireActual('../../services/proposals/dedup'),
  createAlsoRaisedByAppender: jest.fn(),
  createExistingProposalsCounter: jest.fn(),
  createInvestigationOpenChecker: jest.fn(),
  createProposalSlotResolver: jest.fn(),
  resolveProposals: jest.fn(),
}));

const resolveProposalsMock = resolveProposals as jest.Mock;
const createAlsoRaisedByAppenderMock = createAlsoRaisedByAppender as jest.Mock;
const createExistingProposalsCounterMock = createExistingProposalsCounter as jest.Mock;
const createInvestigationOpenCheckerMock = createInvestigationOpenChecker as jest.Mock;
const createProposalSlotResolverMock = createProposalSlotResolver as jest.Mock;

const ISOLATE = 'system-security-action-isolate-host';
const KILL = 'system-security-action-kill-process';

const isolate = (agent: string) => ({
  actionWorkflowId: ISOLATE,
  actionInput: { endpoint_ids: [agent] },
  title: `Isolate ${agent}`,
});

describe('keyCandidateProposals', () => {
  it('keys each proposal by its action and target', () => {
    const { candidates: keyed } = keyCandidateProposals([isolate('agent-a')], 'conv-1');

    expect(keyed).toEqual([
      {
        ...isolate('agent-a'),
        subjectKey: buildProposalSubjectKey({ subjectId: 'agent-a', actionWorkflowId: ISOLATE }),
      },
    ]);
  });

  it('drops a proposal that repeats an earlier one in the same list', () => {
    const { candidates: keyed, repeats } = keyCandidateProposals(
      [isolate('agent-a'), { ...isolate('agent-a'), title: 'Again' }, isolate('agent-b')],
      'conv-1'
    );

    expect(keyed.map(({ title }) => title)).toEqual(['Isolate agent-a', 'Isolate agent-b']);
    expect(repeats).toHaveLength(1);
  });

  it('splits a multi-endpoint proposal so no endpoint is dropped behind another', () => {
    const { candidates: keyed, repeats } = keyCandidateProposals(
      [
        isolate('a'),
        {
          actionWorkflowId: ISOLATE,
          actionInput: { endpoint_ids: ['a', 'b', 'b'] },
          title: 'Isolate a and b',
        },
      ],
      'conv-1'
    );

    expect(keyed.map(({ actionInput }) => actionInput?.endpoint_ids)).toEqual([['a'], ['b']]);
    expect(repeats).toHaveLength(0);
    expect(keyed[0].subjectKey).toBe(
      buildProposalSubjectKey({ subjectId: 'a', actionWorkflowId: ISOLATE })
    );
    expect(keyed[1].subjectKey).toBe(
      buildProposalSubjectKey({ subjectId: 'b', actionWorkflowId: ISOLATE })
    );
  });

  it('counts a multi-endpoint proposal as repeated only when every endpoint is already covered', () => {
    const { candidates, repeats } = keyCandidateProposals(
      [
        isolate('a'),
        isolate('b'),
        { actionWorkflowId: ISOLATE, actionInput: { endpoint_ids: ['a', 'b'] } },
      ],
      'conv-1'
    );

    expect(candidates).toHaveLength(2);
    expect(repeats).toHaveLength(1);
  });

  it('keeps a kill by pid apart from a kill by entity id on the same host', () => {
    const { candidates: keyed } = keyCandidateProposals(
      [
        { actionWorkflowId: KILL, actionInput: { endpoint_ids: ['a'], parameters: { pid: 1 } } },
        {
          actionWorkflowId: KILL,
          actionInput: { endpoint_ids: ['a'], parameters: { entity_id: 'e1' } },
        },
      ],
      'conv-1'
    );

    expect(keyed).toHaveLength(2);
    expect(keyed[0].subjectKey).not.toBe(keyed[1].subjectKey);
  });

  it('keys a proposal with no target to this Investigation, so only its own rerun lands on it', () => {
    const here = keyCandidateProposals([{ actionWorkflowId: ISOLATE }], 'conv-1').candidates;
    const again = keyCandidateProposals([{ actionWorkflowId: ISOLATE }], 'conv-1').candidates;
    const elsewhere = keyCandidateProposals([{ actionWorkflowId: ISOLATE }], 'conv-2').candidates;

    expect(here[0].subjectKey).toBe(again[0].subjectKey);
    expect(here[0].subjectKey).not.toBe(elsewhere[0].subjectKey);
  });
});

describe(`${RESOLVE_PROPOSALS_STEP_ID} step wiring`, () => {
  const proposalsService = {};
  const privileges = { canManage: async () => true, assertCanRead: jest.fn(async () => {}) };
  const conversationClient = { get: jest.fn() };
  const request = {};
  const logger = loggingSystemMock.createLogger();

  const run = (input: unknown, spaceId = 'default') =>
    getResolveProposalsStepDefinition({
      getProposalsService: () => proposalsService as never,
      getProposalPrivileges: () => privileges as never,
      getConversations: () => ({ getScopedClient: async () => conversationClient } as never),
      logger,
    }).handler({
      input,
      contextManager: {
        getContext: () => ({ workflow: { spaceId } }),
        getFakeRequest: () => request,
      },
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    createExistingProposalsCounterMock.mockReturnValue('counter');
    createInvestigationOpenCheckerMock.mockReturnValue('open-checker');
    createProposalSlotResolverMock.mockReturnValue('slot-resolver');
    createAlsoRaisedByAppenderMock.mockReturnValue('appender');
  });

  it('binds the dedup collaborators to the workflow space and request, and hands keyed proposals to resolveProposals', async () => {
    const output = {
      proposals: [],
      converged: [],
      alreadyOpenCount: 0,
      existingProposalCount: 0,
      expectedProposalCount: 0,
      mintSuppression: 'none',
    };
    resolveProposalsMock.mockResolvedValue(output);

    const result = await run(
      { investigationConversationId: 'conv-1', proposals: [isolate('agent-a')] },
      'soc'
    );

    expect(result).toEqual({ output });
    expect(createExistingProposalsCounterMock).toHaveBeenCalledWith({
      proposalsService,
      spaceId: 'soc',
      request,
      logger,
    });
    expect(createInvestigationOpenCheckerMock).toHaveBeenCalledWith({ conversationClient, logger });
    expect(createProposalSlotResolverMock).toHaveBeenCalledWith({
      proposalsService,
      privileges,
      isInvestigationOpen: 'open-checker',
      investigationConversationId: 'conv-1',
      spaceId: 'soc',
      request,
      logger,
    });
    expect(createAlsoRaisedByAppenderMock).toHaveBeenCalledWith({
      proposalsService,
      privileges,
      spaceId: 'soc',
      request,
      logger,
    });
    expect(resolveProposalsMock).toHaveBeenCalledWith({
      candidates: keyCandidateProposals([isolate('agent-a')], 'conv-1').candidates,
      investigationConversationId: 'conv-1',
      spaceId: 'soc',
      deps: {
        countExistingProposals: 'counter',
        resolveProposalSlot: 'slot-resolver',
        appendAlsoRaisedBy: 'appender',
      },
    });
  });

  describe('a proposal repeated within the list', () => {
    const [{ subjectKey }] = keyCandidateProposals([isolate('agent-a')], 'conv-1').candidates;
    const base = {
      proposals: [],
      converged: [],
      alreadyOpenCount: 0,
      alreadyOpenSubjectKeys: [] as string[],
      existingProposalCount: 0,
      expectedProposalCount: 0,
      mintSuppression: 'none',
    };
    const input = {
      investigationConversationId: 'conv-1',
      proposals: [isolate('agent-a'), isolate('agent-a')],
    };

    it("counts as already open when the proposal covering it is this Investigation's own", async () => {
      resolveProposalsMock.mockResolvedValueOnce({
        ...base,
        alreadyOpenCount: 1,
        alreadyOpenSubjectKeys: [subjectKey],
      });
      await expect(run(input)).resolves.toMatchObject({ output: { alreadyOpenCount: 2 } });
    });

    it('does not count when the proposal covering it is only being minted here', async () => {
      resolveProposalsMock.mockResolvedValueOnce({
        ...base,
        proposals: [{ ...isolate('agent-a'), subjectKey, proposalId: 'p-1' }],
      });
      await expect(run(input)).resolves.toMatchObject({ output: { alreadyOpenCount: 0 } });
    });

    it('does not count when the covering proposal converged onto another Investigation', async () => {
      resolveProposalsMock.mockResolvedValueOnce({
        ...base,
        converged: [{ proposalId: 'live', ownerConversationId: 'conv-2' }],
      });
      await expect(run(input)).resolves.toMatchObject({ output: { alreadyOpenCount: 0 } });
    });

    it('does not count when the check failed', async () => {
      resolveProposalsMock.mockResolvedValueOnce({
        ...base,
        alreadyOpenCount: 1,
        alreadyOpenSubjectKeys: [subjectKey],
        mintSuppression: 'check_failed',
      });
      await expect(run(input)).resolves.toMatchObject({ output: { alreadyOpenCount: 1 } });
    });

    it('does not leak the internal subject keys into the output', async () => {
      resolveProposalsMock.mockResolvedValueOnce(base);
      const { output } = (await run(input)) as { output: Record<string, unknown> };
      expect(output).not.toHaveProperty('alreadyOpenSubjectKeys');
    });
  });

  it('refuses a caller who cannot read Proposals before counting or resolving anything, even with no candidates', async () => {
    privileges.assertCanRead.mockRejectedValueOnce(new Error('forbidden'));

    await expect(
      run({ investigationConversationId: 'conv-1', proposals: [] })
    ).rejects.toMatchObject({ type: 'ApiError', message: 'forbidden' });
    expect(privileges.assertCanRead).toHaveBeenCalledWith(request);
    expect(resolveProposalsMock).not.toHaveBeenCalled();
    expect(createExistingProposalsCounterMock).not.toHaveBeenCalled();
  });

  it('rejects input that is not what the schema says', async () => {
    await expect(run({ investigationConversationId: 'conv-1' })).rejects.toMatchObject({
      type: 'ApiError',
    });
    await expect(
      run({ investigationConversationId: 'conv-1', proposals: [{ title: 'no action' }] })
    ).rejects.toMatchObject({ type: 'ApiError' });
    expect(resolveProposalsMock).not.toHaveBeenCalled();
  });

  it('maps a failure in the dedup pass onto an engine error', async () => {
    resolveProposalsMock.mockRejectedValue(new Error('boom'));

    await expect(
      run({ investigationConversationId: 'conv-1', proposals: [isolate('agent-a')] })
    ).rejects.toMatchObject({ type: 'ApiError', message: 'boom' });
  });
});
