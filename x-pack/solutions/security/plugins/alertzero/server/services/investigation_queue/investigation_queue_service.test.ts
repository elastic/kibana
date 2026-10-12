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
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import { MAX_QUEUE_REACH } from '../../../common/investigations/queue';
import { InvestigationQueueService } from './investigation_queue_service';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

const makeProposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'p1',
  spaceId: 'default',
  conversationId: 'conv-1',
  title: 'Do something',
  comment: 'do something',
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  category: 'investigate',
  origin: 'alertzero',
  createdAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

const makeGroup = (conversationId: string, pendingCount = 1) => ({
  conversationId,
  newestProposalAt: '2026-09-01T10:00:00.000Z',
  pendingCount,
  ...(pendingCount > 0
    ? { lead: makeProposal({ id: `p-${conversationId}`, conversationId }) }
    : {}),
});

const makeProposalsService = (groups: ReturnType<typeof makeGroup>[] = []) =>
  ({
    listConversationsByCategory: jest.fn().mockResolvedValue(groups),
  } as unknown as jest.Mocked<ProposalsService>);

interface FakeConversation {
  title?: string;
  agent_id?: string;
  template_id?: string;
  metadata?: Record<string, unknown>;
}

const makeConversation = (id: string, overrides: FakeConversation = {}) => ({
  id,
  title: `Title for ${id}`,
  agent_id: 'elastic-ai-agent',
  template_id: 'investigation',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-09-02T00:00:00.000Z',
  ...overrides,
});

const makeClient = ({
  conversations = [],
  searchResults = [],
  total = searchResults.length,
}: {
  conversations?: Array<ReturnType<typeof makeConversation>>;
  searchResults?: Array<ReturnType<typeof makeConversation>>;
  total?: number;
} = {}) => ({
  bulkGet: jest
    .fn()
    .mockImplementation(
      async (ids: string[]) =>
        new Map(
          conversations
            .filter(({ id }) => ids.includes(id))
            .map((conversation) => [conversation.id, conversation])
        )
    ),
  search: jest.fn().mockResolvedValue({ results: searchResults, total }),
});

const makeAgentBuilder = (client: ReturnType<typeof makeClient>): AgentBuilderPluginStart =>
  ({
    conversations: { getScopedClient: jest.fn().mockResolvedValue(client) },
  } as unknown as AgentBuilderPluginStart);

const makeImpactClient = (
  entityIdsByConversationId: Record<string, string[]> = {}
): AgenticInvestigationsPluginStart['getImpactClient'] =>
  jest.fn().mockReturnValue({
    getEntityIdsByConversationId: jest
      .fn()
      .mockImplementation(
        async (ids: string[]) =>
          new Map(
            ids.flatMap((id) =>
              entityIdsByConversationId[id]
                ? [[id, entityIdsByConversationId[id]] as [string, string[]]]
                : []
            )
          )
      ),
  });

describe('InvestigationQueueService', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  const spaceId = 'default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOpenByCategory', () => {
    it('reads proposals of the category scoped to AlertZero, up to the queue reach', async () => {
      const proposalsService = makeProposalsService();
      const service = new InvestigationQueueService(
        proposalsService,
        makeAgentBuilder(makeClient()),
        logger,
        makeImpactClient()
      );

      const result = await service.listOpenByCategory('respond', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(result).toEqual({ investigations: [], total: 0 });
      expect(proposalsService.listConversationsByCategory).toHaveBeenCalledWith(
        { category: 'respond', origin: ALERTZERO_PROPOSAL_ORIGIN, limit: MAX_QUEUE_REACH },
        spaceId,
        request
      );
    });

    it('keeps the newest-proposal order and drops closed, unreadable and non-investigation conversations', async () => {
      const client = makeClient({
        conversations: [
          makeConversation('conv-a'),
          makeConversation('conv-closed', { metadata: { status: 'closed' } }),
          makeConversation('conv-other', { template_id: 'escalation' }),
          makeConversation('conv-b', { metadata: { status: 'open' } }),
        ],
      });
      const service = new InvestigationQueueService(
        makeProposalsService(
          ['conv-a', 'conv-closed', 'conv-unreadable', 'conv-other', 'conv-b'].map((id) =>
            makeGroup(id)
          )
        ),
        makeAgentBuilder(client),
        logger,
        makeImpactClient()
      );

      const { investigations, total } = await service.listOpenByCategory(
        'investigate',
        request,
        spaceId,
        { size: 10, from: 0 }
      );

      expect(investigations.map(({ id }) => id)).toEqual(['conv-a', 'conv-b']);
      expect(total).toBe(2);
    });

    it('pages over the filtered list, so a dropped conversation never leaves a gap', async () => {
      const ids = ['c1', 'c2', 'c3', 'c4', 'c5'];
      const client = makeClient({
        conversations: ids.map((id) =>
          makeConversation(id, id === 'c2' ? { metadata: { status: 'closed' } } : {})
        ),
      });
      const service = new InvestigationQueueService(
        makeProposalsService(ids.map((id) => makeGroup(id))),
        makeAgentBuilder(client),
        logger,
        makeImpactClient()
      );

      const second = await service.listOpenByCategory('investigate', request, spaceId, {
        size: 2,
        from: 2,
      });

      expect(second.investigations.map(({ id }) => id)).toEqual(['c4', 'c5']);
      expect(second.total).toBe(4);
    });

    it('does not read conversations for a category with no pending proposals', async () => {
      const client = makeClient();
      const service = new InvestigationQueueService(
        makeProposalsService([]),
        makeAgentBuilder(client),
        logger,
        makeImpactClient()
      );

      await service.listOpenByCategory('investigate', request, spaceId, { size: 0, from: 0 });

      expect(client.bulkGet).not.toHaveBeenCalled();
    });

    it('maps the card fields, lead proposal and pending count', async () => {
      const client = makeClient({
        conversations: [
          makeConversation('conv-1', {
            metadata: { description: 'Credential stuffing on the VPN', assignees: 'user-1' },
          }),
        ],
      });
      const group = makeGroup('conv-1', 3);
      const service = new InvestigationQueueService(
        makeProposalsService([group]),
        makeAgentBuilder(client),
        logger,
        makeImpactClient({ 'conv-1': ['host:a'] })
      );

      const { investigations } = await service.listOpenByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(investigations[0]).toMatchObject({
        id: 'conv-1',
        title: 'Title for conv-1',
        description: 'Credential stuffing on the VPN',
        agentId: 'elastic-ai-agent',
        status: 'open',
        assignees: ['user-1'],
        entityIds: ['host:a'],
        category: 'investigate',
        newestProposalAt: group.newestProposalAt,
        pendingProposalCount: 3,
        leadProposal: group.lead,
      });
    });

    it('keeps an open investigation whose proposals are all decided, with no lead proposal', async () => {
      const service = new InvestigationQueueService(
        makeProposalsService([makeGroup('conv-decided', 0)]),
        makeAgentBuilder(makeClient({ conversations: [makeConversation('conv-decided')] })),
        logger,
        makeImpactClient()
      );

      const { investigations, total } = await service.listOpenByCategory(
        'investigate',
        request,
        spaceId,
        { size: 10, from: 0 }
      );

      expect(total).toBe(1);
      expect(investigations[0]).toMatchObject({
        id: 'conv-decided',
        pendingProposalCount: 0,
        newestProposalAt: '2026-09-01T10:00:00.000Z',
      });
      expect(investigations[0].leadProposal).toBeUndefined();
    });

    it('omits entity ids when the impact read fails', async () => {
      const impact = jest.fn().mockReturnValue({
        getEntityIdsByConversationId: jest.fn().mockRejectedValue(new Error('boom')),
      });
      const service = new InvestigationQueueService(
        makeProposalsService([makeGroup('conv-1')]),
        makeAgentBuilder(makeClient({ conversations: [makeConversation('conv-1')] })),
        logger,
        impact as unknown as AgenticInvestigationsPluginStart['getImpactClient']
      );

      const { investigations } = await service.listOpenByCategory('investigate', request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(investigations[0].entityIds).toBeUndefined();
    });
  });

  describe('listClosed', () => {
    const closedConversation = (id: string, metadata: Record<string, unknown> = {}) =>
      makeConversation(id, { metadata: { status: 'closed', ...metadata } });

    const makeService = (client: ReturnType<typeof makeClient>, withProposals: string[] = []) => {
      const proposalsService = {
        findConversationsWithProposals: jest.fn().mockResolvedValue(new Set(withProposals)),
      } as unknown as jest.Mocked<ProposalsService>;
      return {
        proposalsService,
        service: new InvestigationQueueService(
          proposalsService,
          makeAgentBuilder(client),
          logger,
          makeImpactClient()
        ),
      };
    };

    it('searches closed investigations updated in the last 72h, newest first, up to the reach', async () => {
      const client = makeClient();
      const { service } = makeService(client);
      const before = Date.now();

      await service.listClosed(request, spaceId, { size: 25, from: 25 });

      const [{ filter, sort, page, perPage }] = client.search.mock.calls[0];
      expect(filter).toContain('template_id: "investigation"');
      expect(filter).toContain('metadata.status: "closed"');
      const since = Date.parse(/updated_at >= "(.+)"/.exec(filter)![1]);
      expect(before - since).toBeGreaterThanOrEqual(72 * 60 * 60 * 1000 - 1000);
      expect(sort).toEqual({ field: 'updated_at', order: 'desc' });
      expect(page).toBe(1);
      expect(perPage).toBe(MAX_QUEUE_REACH);
    });

    it('leaves out closed investigations that never received a proposal', async () => {
      const client = makeClient({
        searchResults: [closedConversation('triage-only'), closedConversation('with-proposals')],
      });
      const { service, proposalsService } = makeService(client, ['with-proposals']);

      const { investigations, total } = await service.listClosed(request, spaceId, {
        size: 10,
        from: 0,
      });

      expect(investigations.map(({ id }) => id)).toEqual(['with-proposals']);
      expect(total).toBe(1);
      expect(proposalsService.findConversationsWithProposals).toHaveBeenCalledWith(
        { conversationIds: ['triage-only', 'with-proposals'], origin: ALERTZERO_PROPOSAL_ORIGIN },
        spaceId
      );
    });

    it('pages over the filtered list and reports its total', async () => {
      const ids = ['c1', 'c2', 'c3', 'c4'];
      const client = makeClient({
        searchResults: ids.map((id) => closedConversation(id, { close_reason: 'resolved' })),
      });
      const { service } = makeService(client, ['c1', 'c3', 'c4']);

      const { investigations, total } = await service.listClosed(request, spaceId, {
        size: 2,
        from: 1,
      });

      expect(investigations.map(({ id }) => id)).toEqual(['c3', 'c4']);
      expect(investigations[0]).toMatchObject({ status: 'closed', closeReason: 'resolved' });
      expect(total).toBe(3);
    });

    it('serves a count-only read without rows', async () => {
      const client = makeClient({ searchResults: [closedConversation('c1')] });
      const { service } = makeService(client, ['c1']);

      const { investigations, total } = await service.listClosed(request, spaceId, {
        size: 0,
        from: 0,
      });

      expect(investigations).toEqual([]);
      expect(total).toBe(1);
    });
  });
});
