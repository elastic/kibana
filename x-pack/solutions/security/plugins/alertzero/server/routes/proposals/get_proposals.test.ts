/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { GetProposalsListResponse } from '../../../common/proposals/list';
import type { ConversationProposalsService } from '../../services/conversation_proposals/conversation_proposals_service';
import type { RouteDependencies } from '../register_routes';
import { registerGetProposalsRoute } from './get_proposals';

const makeListResult = (
  overrides: Partial<GetProposalsListResponse> = {}
): GetProposalsListResponse => ({
  groups: { closed: [], investigate: [{ id: 'p1' } as never] },
  total: 1,
  truncated: false,
  ...overrides,
});

const makeConversationProposalsService = (
  listResult: GetProposalsListResponse = makeListResult()
): ConversationProposalsService =>
  ({
    list: jest.fn().mockResolvedValue(listResult),
  } as unknown as ConversationProposalsService);

describe('registerGetProposalsRoute', () => {
  const logger = loggingSystemMock.createLogger();

  const setup = (service: ConversationProposalsService = makeConversationProposalsService()) => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion });

    const deps: Partial<RouteDependencies> = {
      router,
      logger,
      config: { enabled: true, ui: { useMockData: false } } as RouteDependencies['config'],
      getSpaceId: () => 'default',
      getConversationProposalsService: () => service,
    };

    registerGetProposalsRoute(deps as RouteDependencies);

    const handler = addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>;

    return { handler, service };
  };

  it('calls service.list with the request, query, and resolved spaceId', async () => {
    const service = makeConversationProposalsService();
    const { handler } = setup(service);
    const request = httpServerMock.createKibanaRequest({ query: { windowHours: 48 } });
    const response = httpServerMock.createResponseFactory();

    await handler({}, request, response);

    expect(service.list).toHaveBeenCalledWith({ windowHours: 48 }, request, 'default');
    expect(response.ok).toHaveBeenCalled();
  });

  it('returns the service result in the response body', async () => {
    const listResult = makeListResult({ total: 3, truncated: true });
    const { handler } = setup(makeConversationProposalsService(listResult));
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest({ query: { windowHours: 24 } }), response);

    const [call] = (response.ok as jest.Mock).mock.calls;
    const body = call[0].body as GetProposalsListResponse;
    expect(body.total).toBe(3);
    expect(body.truncated).toBe(true);
    expect(body.groups).toHaveProperty('investigate');
  });

  it('returns a 500 when service.list throws', async () => {
    const service = {
      list: jest.fn().mockRejectedValue(new Error('ES down')),
    } as unknown as ConversationProposalsService;
    const { handler } = setup(service);
    const response = httpServerMock.createResponseFactory();

    await handler({}, httpServerMock.createKibanaRequest({ query: { windowHours: 24 } }), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
