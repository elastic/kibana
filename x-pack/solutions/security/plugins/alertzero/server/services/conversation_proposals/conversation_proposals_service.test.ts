/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/activity';
import { ConversationProposalsService } from './conversation_proposals_service';

const makeProposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'p1',
  spaceId: 'default',
  conversationId: 'conv-1',
  comment: 'do something',
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  category: 'investigate',
  origin: 'worker',
  createdAt: '2026-09-01T10:00:00.000Z',
  expired: false,
  ...overrides,
});

const makeProposalsService = (
  proposals: ProposalWithMetadata[] = [],
  { total, truncated }: { total?: number; truncated?: boolean } = {}
): ReturnType<AgenticInvestigationsPluginStart['getProposalsService']> =>
  ({
    listActivity: jest.fn().mockResolvedValue({
      proposals,
      total: total ?? proposals.length,
      truncated: truncated ?? false,
    }),
  } as unknown as ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>);

const makeAgentBuilder = (
  getTitleForId: (id: string) => Promise<string> = async (id) => `Title for ${id}`
): AgentBuilderPluginStart =>
  ({
    conversations: {
      getScopedClient: jest.fn().mockResolvedValue({
        get: jest
          .fn()
          .mockImplementation(async (id: string) => ({ title: await getTitleForId(id) })),
      }),
    },
  } as unknown as AgentBuilderPluginStart);

describe('ConversationProposalsService', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  const query = { windowHours: 24 };
  const spaceId = 'default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls listActivity with the provided query and spaceId', async () => {
    const proposalsService = makeProposalsService();
    const service = new ConversationProposalsService(proposalsService, makeAgentBuilder(), logger);

    await service.list(query, request, spaceId);

    expect(proposalsService.listActivity).toHaveBeenCalledWith(query, spaceId);
  });

  it('deduplicates conversation ids before fetching titles', async () => {
    const proposals = [
      makeProposal({ id: 'p1', conversationId: 'shared' }),
      makeProposal({ id: 'p2', conversationId: 'shared' }),
    ];
    const getScopedClient = jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue({ title: 'Shared title' }),
    });
    const agentBuilder = {
      conversations: { getScopedClient },
    } as unknown as AgentBuilderPluginStart;

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      agentBuilder,
      logger
    );
    await service.list(query, request, spaceId);

    const scopedClient = await getScopedClient.mock.results[0].value;
    expect(scopedClient.get).toHaveBeenCalledTimes(1);
  });

  it('still resolves when one title fetch fails', async () => {
    const proposals = [
      makeProposal({ id: 'p1', conversationId: 'good' }),
      makeProposal({ id: 'p2', conversationId: 'bad' }),
    ];
    const agentBuilder = makeAgentBuilder(async (id) => {
      if (id === 'bad') throw new Error('access denied');
      return `Title for ${id}`;
    });

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      agentBuilder,
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.investigate).toHaveLength(2);
    expect(result.groups.investigate[0].conversationTitle).toBe('Title for good');
    expect(result.groups.investigate[1]).not.toHaveProperty('conversationTitle');
  });

  it('groups pending proposals by category and decided proposals under closed', async () => {
    const proposals = [
      makeProposal({ id: 'pending', category: 'contain', status: 'pending' }),
      makeProposal({
        id: 'decided',
        category: 'tune',
        status: 'dismissed',
        decidedAt: '2026-09-09T10:00:00.000Z',
      }),
    ];

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.contain).toHaveLength(1);
    expect(result.groups.contain[0].id).toBe('pending');
    expect(result.groups[CLOSED_GROUP_KEY]).toHaveLength(1);
    expect(result.groups[CLOSED_GROUP_KEY][0].id).toBe('decided');
    expect(result.groups.tune).toBeUndefined();
  });

  it('passes total and truncated through from listActivity', async () => {
    const proposalsService = makeProposalsService([makeProposal()], {
      total: 501,
      truncated: true,
    });
    const service = new ConversationProposalsService(proposalsService, makeAgentBuilder(), logger);

    const result = await service.list(query, request, spaceId);

    expect(result.total).toBe(501);
    expect(result.truncated).toBe(true);
  });

  it('attaches conversation titles to each proposal item', async () => {
    const proposals = [makeProposal({ conversationId: 'conv-xyz' })];
    const agentBuilder = makeAgentBuilder(async () => 'My investigation');

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      agentBuilder,
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.investigate[0].conversationTitle).toBe('My investigation');
  });
});
