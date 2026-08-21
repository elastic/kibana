/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import type { IRouter, Logger, RequestHandler, RequestHandlerContext } from '@kbn/core/server';
import type { ReadOnlyConversationClient } from '@kbn/agent-builder-server';
import type { PndConfig } from '../../config';
import { registerGetConversationRoute } from './get_conversation';

function createCapturingRouter() {
  const handlers = new Map<string, RequestHandler>();
  const makeBuilder = (p: string) => ({
    addVersion: (_c: unknown, h: RequestHandler) => {
      handlers.set(p, h);
    },
  });
  return {
    versioned: {
      get: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
    getHandler: (p: string) => {
      const h = handlers.get(p);
      if (!h) throw new Error('No handler for ' + p);
      return h;
    },
  } as unknown as IRouter & { getHandler: (p: string) => RequestHandler };
}
const createLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as any);

const BASE_CONFIG: PndConfig = {
  enabled: true,
  ui: { useMockData: true },
  conversationShadowWrite: false,
};

// RouteDependencies requires config/getSpaceId/getWatchProjection/
// getWorkflowsManagement/getInvestigationStore even though this route only
// exercises getConversationClient — these are unused no-ops for this suite.
const BASE_DEPS = {
  config: BASE_CONFIG,
  getSpaceId: () => 'default',
  getWatchProjection: () => undefined,
  getWorkflowsManagement: () => undefined,
  getInvestigationStore: () => undefined,
};

const EMPTY_CONTEXT = {} as unknown as RequestHandlerContext;
const PATH = PND_INVESTIGATION_URL_TEMPLATE + '/conversation';

describe('GET conversation route', () => {
  it('returns 404 when client is undefined', async () => {
    const router = createCapturingRouter();
    registerGetConversationRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getConversationClient: undefined,
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: PATH,
      params: { id: 'inv-1' },
    });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 404 when client resolves to undefined', async () => {
    const router = createCapturingRouter();
    registerGetConversationRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getConversationClient: (): Promise<ReadOnlyConversationClient> | undefined => undefined,
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: PATH,
      params: { id: 'inv-1' },
    });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 404 when no conversation matches origin', async () => {
    const router = createCapturingRouter();
    const mockClient = {
      list: jest
        .fn()
        .mockResolvedValue([{ id: 'c', origin: { external_conversation_id: 'other' } }]),
      get: jest.fn(),
    };
    registerGetConversationRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getConversationClient: () => Promise.resolve(mockClient as any),
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: PATH,
      params: { id: 'inv-target' },
    });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(mockClient.list).toHaveBeenCalled();
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 200 when origin matches', async () => {
    const router = createCapturingRouter();
    const conv = {
      id: 'c1',
      title: 'T',
      origin: { external_conversation_id: 'inv-target' },
      rounds: [],
    };
    const mockClient = {
      list: jest.fn().mockResolvedValue([
        { id: 'c0', origin: { external_conversation_id: 'other' } },
        { id: 'c1', origin: { external_conversation_id: 'inv-target' } },
      ]),
      get: jest.fn().mockResolvedValue(conv),
    };
    registerGetConversationRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getConversationClient: () => Promise.resolve(mockClient as any),
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: PATH,
      params: { id: 'inv-target' },
    });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(mockClient.get).toHaveBeenCalledWith('c1');
    expect(response.ok).toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.id).toBe('c1');
  });

  it('returns 500 on error', async () => {
    const router = createCapturingRouter();
    const logger = createLogger();
    registerGetConversationRoute({
      ...BASE_DEPS,
      router,
      logger,
      getConversationClient: () => Promise.reject(new Error('down')),
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: PATH,
      params: { id: 'inv-1' },
    });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(response.customError).toHaveBeenCalled();
    expect((response.customError as jest.Mock).mock.calls[0][0].statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
