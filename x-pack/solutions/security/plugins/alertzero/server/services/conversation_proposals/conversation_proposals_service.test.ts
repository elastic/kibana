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
import { CLOSED_GROUP_KEY } from '../../../common/proposals/list';
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
    listByWindow: jest.fn().mockResolvedValue({
      proposals,
      total: total ?? proposals.length,
      truncated: truncated ?? false,
    }),
  } as unknown as ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>);

/**
 * Builds an Agent Builder mock whose scoped client exposes `bulkGet`.
 *
 * @param titlesById - A map from conversation id to title. Ids absent from the map are omitted
 *   from the returned `Map`, mirroring the real bulk-get behaviour for inaccessible conversations.
 *   Defaults to returning `Title for ${id}` for every requested id.
 */
const makeAgentBuilder = (titlesById?: Record<string, string>): AgentBuilderPluginStart =>
  ({
    conversations: {
      getScopedClient: jest.fn().mockResolvedValue({
        bulkGet: jest.fn().mockImplementation(async (ids: string[]) => {
          const result = new Map<string, { title: string }>();
          for (const id of ids) {
            const title = titlesById ? titlesById[id] : `Title for ${id}`;
            if (title !== undefined) {
              result.set(id, { title });
            }
          }
          return result;
        }),
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

  it('calls listByWindow with the provided query and spaceId', async () => {
    const proposalsService = makeProposalsService();
    const service = new ConversationProposalsService(proposalsService, makeAgentBuilder(), logger);

    await service.list(query, request, spaceId);

    expect(proposalsService.listByWindow).toHaveBeenCalledWith(
      { includeStatuses: ['pending'], decidedWithinHours: query.windowHours },
      spaceId,
      request
    );
  });

  it('deduplicates conversation ids before fetching titles', async () => {
    const proposals = [
      makeProposal({ id: 'p1', conversationId: 'shared' }),
      makeProposal({ id: 'p2', conversationId: 'shared' }),
    ];
    const getScopedClient = jest.fn().mockResolvedValue({
      bulkGet: jest.fn().mockResolvedValue(new Map([['shared', { title: 'Shared title' }]])),
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
    expect(scopedClient.bulkGet).toHaveBeenCalledWith(['shared']);
  });

  it('omits titles for ids absent from the bulk response', async () => {
    const proposals = [
      makeProposal({ id: 'p1', conversationId: 'good' }),
      makeProposal({ id: 'p2', conversationId: 'bad' }),
    ];
    // 'bad' is not in the returned map (inaccessible / not found)
    const agentBuilder = makeAgentBuilder({ good: 'Title for good' });

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

  it('still resolves when the bulk fetch fails', async () => {
    const proposals = [
      makeProposal({ id: 'p1', conversationId: 'good' }),
      makeProposal({ id: 'p2', conversationId: 'bad' }),
    ];
    const getScopedClient = jest.fn().mockResolvedValue({
      bulkGet: jest.fn().mockRejectedValue(new Error('access denied')),
    });
    const agentBuilder = {
      conversations: { getScopedClient },
    } as unknown as AgentBuilderPluginStart;

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      agentBuilder,
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.investigate).toHaveLength(2);
    expect(result.groups.investigate[0]).not.toHaveProperty('conversationTitle');
    expect(result.groups.investigate[1]).not.toHaveProperty('conversationTitle');
  });

  it('derives total from grouped items; passes truncated through from listByWindow', async () => {
    const proposalsService = makeProposalsService([makeProposal()], {
      total: 501,
      truncated: true,
    });
    const service = new ConversationProposalsService(proposalsService, makeAgentBuilder(), logger);

    const result = await service.list(query, request, spaceId);

    // total reflects what actually made it into groups (1 proposal → 1 grouped item),
    // not the raw ES hit count, so the UI count never overstates visible items.
    expect(result.total).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it('attaches conversation titles to each proposal item', async () => {
    const proposals = [makeProposal({ conversationId: 'conv-xyz' })];
    const agentBuilder = makeAgentBuilder({ 'conv-xyz': 'My investigation' });

    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      agentBuilder,
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.investigate[0].conversationTitle).toBe('My investigation');
  });

  it('places a pending proposal under its category, not under closed', async () => {
    const proposals = [makeProposal({ status: 'pending', category: 'contain' })];
    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.contain).toHaveLength(1);
    expect(result.groups[CLOSED_GROUP_KEY]).toHaveLength(0);
  });

  it('places a decided proposal under closed, not under its category', async () => {
    const proposals = [
      makeProposal({
        status: 'dismissed',
        category: 'contain',
        decidedAt: '2026-09-09T10:00:00.000Z',
      }),
    ];
    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups[CLOSED_GROUP_KEY]).toHaveLength(1);
    expect(result.groups.contain).toBeUndefined();
  });

  it('only initializes closed by default; other keys created on demand', async () => {
    const service = new ConversationProposalsService(
      makeProposalsService([]),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups).toHaveProperty(CLOSED_GROUP_KEY);
    expect(Object.keys(result.groups)).toEqual([CLOSED_GROUP_KEY]);
  });

  it('creates a category key on demand for any category string', async () => {
    const proposals = [makeProposal({ status: 'pending', category: 'remediate' })];
    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups.remediate).toHaveLength(1);
  });

  it('sorts the closed bucket by decidedAt descending', async () => {
    const proposals = [
      makeProposal({ id: 'older', status: 'dismissed', decidedAt: '2026-09-08T10:00:00.000Z' }),
      makeProposal({ id: 'newer', status: 'succeeded', decidedAt: '2026-09-09T10:00:00.000Z' }),
    ];
    const service = new ConversationProposalsService(
      makeProposalsService(proposals),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups[CLOSED_GROUP_KEY][0].id).toBe('newer');
    expect(result.groups[CLOSED_GROUP_KEY][1].id).toBe('older');
  });

  it('drops a pending proposal with no category', async () => {
    const proposal = makeProposal({ status: 'pending', category: undefined });
    const service = new ConversationProposalsService(
      makeProposalsService([proposal]),
      makeAgentBuilder(),
      logger
    );
    const result = await service.list(query, request, spaceId);

    expect(result.groups[CLOSED_GROUP_KEY]).toHaveLength(0);
    expect(Object.keys(result.groups)).toEqual([CLOSED_GROUP_KEY]);
  });
});
