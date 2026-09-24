/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ALERTZERO_PROPOSAL_ORIGIN } from '@kbn/workflows/managed';
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
  { total }: { total?: number } = {}
): ReturnType<ProposalsPluginStart['getProposalsService']> =>
  ({
    list: jest.fn().mockResolvedValue({
      proposals,
      total: total ?? proposals.length,
    }),
  } as unknown as ReturnType<ProposalsPluginStart['getProposalsService']>);

/**
 * Builds an Agent Builder mock whose scoped client exposes `bulkGet`.
 *
 * @param titlesById - A map from conversation id to title. Ids absent from the map are omitted
 *   from the returned `Map`, mirroring the real bulk-get behaviour for inaccessible conversations.
 *   Defaults to returning `Title for ${id}` for every requested id.
 * @param agentIdsById - Agent id per conversation. Defaults to `elastic-ai-agent` for every id
 *   present in the response, matching what `bulkGet`'s `_source` allowlist always returns.
 * @param assigneesById - Raw `metadata.assignees` per conversation. Omitted entries carry no
 *   `metadata` at all, which is the shape an unassigned conversation comes back as.
 */
const makeAgentBuilder = (
  titlesById?: Record<string, string>,
  agentIdsById?: Record<string, string>,
  assigneesById?: Record<string, unknown>
): AgentBuilderPluginStart =>
  ({
    conversations: {
      getScopedClient: jest.fn().mockResolvedValue({
        bulkGet: jest.fn().mockImplementation(async (ids: string[]) => {
          const result = new Map<
            string,
            { title: string; agent_id?: string; metadata?: Record<string, unknown> }
          >();
          for (const id of ids) {
            const title = titlesById ? titlesById[id] : `Title for ${id}`;
            if (title !== undefined) {
              const assignees = assigneesById?.[id];
              result.set(id, {
                title,
                agent_id: agentIdsById ? agentIdsById[id] : 'elastic-ai-agent',
                ...(assignees !== undefined ? { metadata: { assignees } } : {}),
              });
            }
          }
          return result;
        }),
      }),
    },
  } as unknown as AgentBuilderPluginStart);

const makeImpactClient = (
  entityIdsByConversationId: Record<string, string[]> = {}
): AgenticInvestigationsPluginStart['getImpactClient'] =>
  jest.fn().mockReturnValue({
    listByConversationIds: jest.fn().mockImplementation(async (ids: string[]) =>
      ids.flatMap((conversationId) => {
        const entityIds = entityIdsByConversationId[conversationId];
        return entityIds ? [{ conversationId, entities: entityIds.map((id) => ({ id })) }] : [];
      })
    ),
  });

describe('ConversationProposalsService', () => {
  it.each([
    [
      'listByCategory',
      (service: ConversationProposalsService) =>
        service.listByCategory('respond', request, spaceId, { size: 10, from: 0 }),
    ],
    [
      'listClosed',
      (service: ConversationProposalsService) =>
        service.listClosed(request, spaceId, { size: 10, from: 0 }),
    ],
  ])('%s shows only AlertZero-produced proposals', async (_name, run) => {
    const proposalsService = makeProposalsService();

    await run(
      new ConversationProposalsService(
        proposalsService,
        makeAgentBuilder(),
        logger,
        makeImpactClient()
      )
    );

    // The index is shared with every other solution's proposals, and this
    // filter is the only thing keeping theirs out of an AlertZero queue.
    expect(proposalsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ origin: ALERTZERO_PROPOSAL_ORIGIN }),
      spaceId,
      expect.anything()
    );
  });

  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  const spaceId = 'default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listByCategory', () => {
    it('totally orders the category page, so an offset boundary cannot duplicate or skip a row', async () => {
      const proposalsService = makeProposalsService();
      const service = new ConversationProposalsService(
        proposalsService,
        makeAgentBuilder(),
        logger,
        makeImpactClient()
      );

      await service.listByCategory('respond', request, spaceId, { size: 10, from: 0 });

      expect(proposalsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'respond',
          status: 'pending',
          excludeSuperseded: true,
          size: 10,
          from: 0,
        }),
        spaceId,
        [
          { createdAt: { order: 'desc' } },
          { rootProposalId: { order: 'asc' } },
          { revision: { order: 'asc' } },
        ]
      );
    });

    it('enriches each proposal with its conversation title', async () => {
      const proposals = [makeProposal({ conversationId: 'conv-abc' })];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({ 'conv-abc': 'My investigation' }),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0].conversationTitle).toBe('My investigation');
    });

    it("attaches the conversation's agent id so the client can build its Agent Builder URL", async () => {
      const proposals = [makeProposal({ conversationId: 'conv-xyz' })];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({ 'conv-xyz': 'My investigation' }, { 'conv-xyz': 'custom-agent' }),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0].conversationAgentId).toBe('custom-agent');
    });

    it('omits the agent id for ids absent from the bulk response', async () => {
      const proposals = [makeProposal({ id: 'p1', conversationId: 'bad' })];
      // 'bad' is not in the returned map (inaccessible / not found)

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({}),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0]).not.toHaveProperty('conversationAgentId');
    });

    it('attaches assignees from conversation metadata', async () => {
      const proposals = [makeProposal({ conversationId: 'conv-assigned' })];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({ 'conv-assigned': 'Assigned investigation' }, undefined, {
          'conv-assigned': ['user-1', 'user-2'],
        }),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0].conversationAssignees).toEqual(['user-1', 'user-2']);
    });

    /**
     * A TEXT_ARRAY only deserializes back to an array when the conversation's template
     * resolves; otherwise a single assignee arrives as a bare string.
     */
    it('reads a single assignee that arrived unserialized as a bare string', async () => {
      const proposals = [makeProposal({ conversationId: 'conv-flat' })];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({ 'conv-flat': 'Flat metadata' }, undefined, {
          'conv-flat': 'sole.analyst',
        }),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0].conversationAssignees).toEqual(['sole.analyst']);
    });

    // Always an array, so no caller needs a fallback. Each of the three ways it can be
    // absent has its own path through the enrichment.
    it.each([
      ['the metadata key is absent', () => makeAgentBuilder({ 'conv-1': 'Unassigned' })],
      ['the conversation is unresolvable', () => makeAgentBuilder({})],
      [
        'the bulk fetch fails',
        () =>
          ({
            conversations: {
              getScopedClient: jest.fn().mockResolvedValue({
                bulkGet: jest.fn().mockRejectedValue(new Error('access denied')),
              }),
            },
          } as unknown as AgentBuilderPluginStart),
      ],
    ])('defaults assignees to an empty array when %s', async (_label, buildAgentBuilder) => {
      const proposals = [makeProposal({ conversationId: 'conv-1' })];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        buildAgentBuilder(),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals[0].conversationAssignees).toEqual([]);
    });

    it('runs a single bulkGet for deduplicated conversation ids', async () => {
      const proposals = [
        makeProposal({ id: 'p1', conversationId: 'shared' }),
        makeProposal({ id: 'p2', conversationId: 'shared' }),
      ];
      const getScopedClient = jest.fn().mockResolvedValue({
        bulkGet: jest.fn().mockResolvedValue(new Map([['shared', { title: 'Shared' }]])),
      });
      const agentBuilder = {
        conversations: { getScopedClient },
      } as unknown as AgentBuilderPluginStart;

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        agentBuilder,
        logger,
        makeImpactClient()
      );

      await service.listByCategory('investigate', request, spaceId, { size: 10, from: 0 });

      const scopedClient = await getScopedClient.mock.results[0].value;
      expect(scopedClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(scopedClient.bulkGet).toHaveBeenCalledWith(['shared']);
    });

    it('returns unenriched proposals when bulkGet throws', async () => {
      const proposals = [makeProposal({ conversationId: 'conv-1' })];
      const agentBuilder = {
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({
            bulkGet: jest.fn().mockRejectedValue(new Error('network error')),
          }),
        },
      } as unknown as AgentBuilderPluginStart;

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        agentBuilder,
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0]).not.toHaveProperty('conversationTitle');
    });

    it('passes total from proposalsService.list through unchanged', async () => {
      const service = new ConversationProposalsService(
        makeProposalsService([makeProposal()], { total: 42 }),
        makeAgentBuilder(),
        logger,
        makeImpactClient()
      );

      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.total).toBe(42);
    });

    it('attaches hydrated entity ids to each proposal for the same conversation', async () => {
      const proposals = [
        makeProposal({ id: 'p1', conversationId: 'shared' }),
        makeProposal({ id: 'p2', conversationId: 'shared' }),
        makeProposal({ id: 'p3', conversationId: 'other' }),
      ];
      const listByConversationIds = jest
        .fn()
        .mockImplementation(async (ids: string[]) =>
          ids.flatMap((conversationId) =>
            conversationId === 'shared'
              ? [{ conversationId, entities: [{ id: 'user-1' }, { id: 'host-1' }] }]
              : []
          )
        );
      const getImpactClient = jest.fn().mockReturnValue({ listByConversationIds });

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder(),
        logger,
        getImpactClient
      );
      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(getImpactClient).toHaveBeenCalledWith(request);
      expect(listByConversationIds).toHaveBeenCalledWith(['shared', 'other']);
      expect(result.proposals[0].entityIds).toEqual(['user-1', 'host-1']);
      expect(result.proposals[1].entityIds).toEqual(['user-1', 'host-1']);
      expect(result.proposals[2]).not.toHaveProperty('entityIds');
    });

    it('still resolves when the impact fetch fails', async () => {
      const service = new ConversationProposalsService(
        makeProposalsService([makeProposal()]),
        makeAgentBuilder(),
        logger,
        jest.fn().mockReturnValue({
          listByConversationIds: jest.fn().mockRejectedValue(new Error('index missing')),
        })
      );
      const result = await service.listByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].conversationTitle).toBe('Title for conv-1');
      expect(result.proposals[0]).not.toHaveProperty('entityIds');
    });
  });

  describe('listClosed', () => {
    it('totally orders the closed page, so an offset boundary cannot duplicate or skip a row', async () => {
      const proposalsService = makeProposalsService();
      const service = new ConversationProposalsService(
        proposalsService,
        makeAgentBuilder(),
        logger,
        makeImpactClient()
      );

      await service.listClosed(request, spaceId, { size: 25, from: 0 });

      expect(proposalsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          decidedWithinHours: 72,
          excludeSuperseded: true,
          size: 25,
          from: 0,
        }),
        spaceId,
        [
          { decidedAt: { order: 'desc' } },
          { createdAt: { order: 'desc' } },
          { rootProposalId: { order: 'asc' } },
          { revision: { order: 'asc' } },
        ]
      );
    });

    it('enriches proposals with conversation titles', async () => {
      const proposals = [
        makeProposal({
          status: 'no_action',
          decision: 'dismissed',
          decidedAt: '2026-09-01T00:00:00Z',
        }),
      ];

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        makeAgentBuilder({ 'conv-1': 'Closed investigation' }),
        logger,
        makeImpactClient()
      );

      const result = await service.listClosed(request, spaceId, { size: 25, from: 0 });

      expect(result.proposals[0].conversationTitle).toBe('Closed investigation');
    });

    it('returns unenriched proposals when bulkGet throws', async () => {
      const proposals = [makeProposal({ status: 'no_action', decision: 'dismissed' })];
      const agentBuilder = {
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({
            bulkGet: jest.fn().mockRejectedValue(new Error('access denied')),
          }),
        },
      } as unknown as AgentBuilderPluginStart;

      const service = new ConversationProposalsService(
        makeProposalsService(proposals),
        agentBuilder,
        logger,
        makeImpactClient()
      );

      const result = await service.listClosed(request, spaceId, { size: 25, from: 0 });

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0]).not.toHaveProperty('conversationTitle');
    });

    it('passes total from proposalsService.list through unchanged', async () => {
      const service = new ConversationProposalsService(
        makeProposalsService([makeProposal()], { total: 100 }),
        makeAgentBuilder(),
        logger,
        makeImpactClient()
      );

      const result = await service.listClosed(request, spaceId, { size: 25, from: 0 });

      expect(result.total).toBe(100);
    });
  });
});
