/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import type { IRouter, Logger, RequestHandler, RequestHandlerContext } from '@kbn/core/server';
import type { PndConfig } from '../../config';
import { registerListApprovedProposalsRoute } from './list_approved_proposals';

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
// getWorkflowsManagement even though this route only exercises
// getInvestigationStore — these are unused no-ops for this suite.
const BASE_DEPS = {
  config: BASE_CONFIG,
  getSpaceId: () => 'default',
  getWatchProjection: () => undefined,
  getWorkflowsManagement: () => undefined,
};

const EMPTY_CONTEXT = {} as unknown as RequestHandlerContext;
const PATH = PND_INVESTIGATIONS_URL + '/proposals/approved';

describe('GET approved proposals route', () => {
  it('returns seed data when store is null', async () => {
    const router = createCapturingRouter();
    registerListApprovedProposalsRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getInvestigationStore: () => undefined,
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ method: 'get', path: PATH });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    expect(response.ok).toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.total).toBeGreaterThan(0);
    expect(body.proposals.every((p: any) => p.status === 'approved')).toBe(true);
  });

  it('limits results to 20', async () => {
    const router = createCapturingRouter();
    registerListApprovedProposalsRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getInvestigationStore: () => undefined,
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ method: 'get', path: PATH });
    await router.getHandler(PATH)(EMPTY_CONTEXT, request, response);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.proposals.length).toBeLessThanOrEqual(20);
  });

  it('returns 500 on store error', async () => {
    const router = createCapturingRouter();
    const mockStore = { listApprovedProposals: jest.fn().mockRejectedValue(new Error('ES down')) };
    registerListApprovedProposalsRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      getInvestigationStore: () => mockStore as any,
    });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ method: 'get', path: PATH });
    const ctx = {
      core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: {} } } }),
    } as any;
    await router.getHandler(PATH)(ctx, request, response);
    expect(response.customError).toHaveBeenCalled();
    expect((response.customError as jest.Mock).mock.calls[0][0].statusCode).toBe(500);
  });
});
