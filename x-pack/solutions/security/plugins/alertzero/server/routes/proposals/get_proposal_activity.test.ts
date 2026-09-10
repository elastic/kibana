/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../register_routes';
import { registerGetProposalActivityRoute } from './get_proposal_activity';

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

const makeAgentBuilder = (): AgentBuilderPluginStart =>
  ({
    conversations: {
      getScopedClient: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({ title: 'My conversation' }),
      }),
    },
  } as unknown as AgentBuilderPluginStart);

describe('registerGetProposalActivityRoute', () => {
  const logger = loggingSystemMock.createLogger();

  const setup = (listActivityResult: ReturnType<typeof makeProposal>[] = []) => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion });

    const listActivity = jest.fn().mockResolvedValue({
      proposals: listActivityResult,
      total: listActivityResult.length,
      truncated: false,
    });

    const deps: Partial<RouteDependencies> = {
      router,
      logger,
      config: { enabled: true, ui: { useMockData: false } } as RouteDependencies['config'],
      getSpaceId: () => 'default',
      getProposalsService: () =>
        ({ listActivity } as unknown as ReturnType<RouteDependencies['getProposalsService']>),
      getAgentBuilder: makeAgentBuilder,
    };

    registerGetProposalActivityRoute(deps as RouteDependencies);

    const handler = addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>;

    return { handler, listActivity };
  };

  it('calls listActivity with the resolved spaceId and query windowHours', async () => {
    const { handler, listActivity } = setup();
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest({ query: { windowHours: 48 } }), response);

    expect(listActivity).toHaveBeenCalledWith({ windowHours: 48 }, 'default');
    expect(response.ok).toHaveBeenCalled();
  });

  it('returns groups, total, and truncated in the response body', async () => {
    const proposals = [makeProposal()];
    const { handler } = setup(proposals);
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest({ query: { windowHours: 24 } }), response);

    const [call] = (response.ok as jest.Mock).mock.calls;
    const body = call[0].body as { groups: unknown; total: number; truncated: boolean };
    expect(body.total).toBe(1);
    expect(body.truncated).toBe(false);
    expect(body.groups).toHaveProperty('investigate');
  });

  it('returns a 500 when listActivity throws', async () => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion });

    const deps: Partial<RouteDependencies> = {
      router,
      logger,
      config: { enabled: true, ui: { useMockData: false } } as RouteDependencies['config'],
      getSpaceId: () => 'default',
      getProposalsService: () =>
        ({
          listActivity: jest.fn().mockRejectedValue(new Error('ES down')),
        } as unknown as ReturnType<RouteDependencies['getProposalsService']>),
      getAgentBuilder: makeAgentBuilder,
    };

    registerGetProposalActivityRoute(deps as RouteDependencies);

    const handler = addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>;
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest({ query: { windowHours: 24 } }), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
