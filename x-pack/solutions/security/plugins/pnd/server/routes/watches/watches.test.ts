/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { PND_WATCHES_URL, PND_WATCH_URL_TEMPLATE } from '@kbn/pnd-common';
import type { PndConfig } from '../../config';
import type { PndSpaceIdResolver } from '../../types';
import type { WatchWorkflowProjectionService } from '../../services/watches/watch_workflow_projection_service';
import { registerListWatchesRoute } from './list_watches';
import { registerGetWatchRoute } from './get_watch';
import type { IRouter, Logger, RequestHandler, RequestHandlerContext } from '@kbn/core/server';

// ── Fake router that captures the handler ─────────────────────────────────

/**
 * A minimal IRouter substitute that captures versioned route handlers
 * as they're registered, so tests can invoke them directly.
 */
function createCapturingRouter() {
  const handlers = new Map<string, RequestHandler>();

  const makeBuilder = (path: string) => ({
    addVersion: (_config: unknown, handler: RequestHandler) => {
      handlers.set(path, handler);
    },
  });

  return {
    versioned: {
      get: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
      post: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
      put: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
      delete: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
    },
    getHandler: (path: string) => {
      const h = handlers.get(path);
      if (!h) throw new Error(`No handler registered for ${path}`);
      return h;
    },
  } as unknown as IRouter & { getHandler: (path: string) => RequestHandler };
}

// ── Shared deps ───────────────────────────────────────────────────────────

const createLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as any);

const createMockConfig = (overrides: Partial<PndConfig> = {}): PndConfig => ({
  enabled: true,
  ui: { useMockData: true, ...overrides.ui },
  conversationShadowWrite: false,
  ...overrides,
});

const NOOP_SPACE_RESOLVER: PndSpaceIdResolver = () => 'default';
const NOOP_PROJECTION = (): WatchWorkflowProjectionService | undefined => undefined;

const setupRouter = (registerFn: (deps: any) => void, configOverrides: Partial<PndConfig> = {}) => {
  const router = createCapturingRouter();
  const logger = createLogger();
  const config = createMockConfig(configOverrides);

  registerFn({
    router,
    logger,
    config,
    getSpaceId: NOOP_SPACE_RESOLVER,
    getWatchProjection: NOOP_PROJECTION,
    getWorkflowsManagement: () => undefined,
    getInvestigationStore: () => undefined,
  });

  return { router, logger, config };
};

const makeResponse = () => httpServerMock.createResponseFactory();

const makeRequest = (path: string, params: Record<string, string> = {}) =>
  httpServerMock.createKibanaRequest({ method: 'get', path, params });

// Route handlers only destructure `core`/`resolve` off the context in this
// plugin's handlers today (neither is touched), so an empty object cast is
// sufficient here — same convention used across the repo (see e.g.
// x-pack/solutions/security/plugins/discoveries/server/lib/assert_workflows_enabled/index.test.ts).
const EMPTY_CONTEXT = {} as unknown as RequestHandlerContext;

// ── List Watches ──────────────────────────────────────────────────────────

describe('GET /internal/pnd/watches — list watches', () => {
  it('returns mock watches when useMockData=true', async () => {
    const { router } = setupRouter(registerListWatchesRoute, { ui: { useMockData: true } });
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCHES_URL);

    await handler(EMPTY_CONTEXT, makeRequest(PND_WATCHES_URL), response);

    expect(response.ok).toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.watches).toBeDefined();
    expect(body.watches.length).toBeGreaterThan(0);
  });

  it('includes Deep Watch, Dark Watch, and Watch Floor in mock data', async () => {
    const { router } = setupRouter(registerListWatchesRoute);
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCHES_URL);

    await handler(EMPTY_CONTEXT, makeRequest(PND_WATCHES_URL), response);

    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    const ids = body.watches.map((w: any) => w.id);
    expect(ids).toContain('system-security-watch-deep');
    expect(ids).toContain('system-security-watch-dark');
    expect(ids).toContain('system-security-watch-floor');
  });

  it('returns empty watches when projection unavailable and mockData=false', async () => {
    const { router } = setupRouter(registerListWatchesRoute, {
      ui: { useMockData: false },
    });
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCHES_URL);

    await handler(EMPTY_CONTEXT, makeRequest(PND_WATCHES_URL), response);

    expect(response.ok).toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.watches).toEqual([]);
  });

  it('returns 500 when projection throws', async () => {
    const { config } = setupRouter(registerListWatchesRoute, {
      ui: { useMockData: false },
    });
    // Override projection to throw
    const throwingRouter = createCapturingRouter();
    registerListWatchesRoute({
      router: throwingRouter,
      logger: createLogger(),
      config: { ...config, ui: { useMockData: false } },
      getSpaceId: NOOP_SPACE_RESOLVER,
      getWatchProjection: () =>
        ({
          list: async () => {
            throw new Error('ES down');
          },
        } as any),
      getWorkflowsManagement: () => undefined,
      getInvestigationStore: () => undefined,
    });

    const response = makeResponse();
    const handler = throwingRouter.getHandler(PND_WATCHES_URL);

    await handler(EMPTY_CONTEXT, makeRequest(PND_WATCHES_URL), response);

    expect(response.customError).toHaveBeenCalled();
    expect((response.customError as jest.Mock).mock.calls[0][0].statusCode).toBe(500);
  });
});

// ── Get Watch by ID ───────────────────────────────────────────────────────

describe('GET /internal/pnd/watches/{watchId} — get watch', () => {
  it('returns a mock watch by ID', async () => {
    const { router } = setupRouter(registerGetWatchRoute);
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCH_URL_TEMPLATE);

    await handler(
      EMPTY_CONTEXT,
      makeRequest(PND_WATCH_URL_TEMPLATE, { watchId: 'system-security-watch-deep' }),
      response
    );

    expect(response.ok).toHaveBeenCalled();
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.watch).toBeDefined();
    expect(body.watch.id).toBe('system-security-watch-deep');
  });

  it('returns 404 for unknown watch ID', async () => {
    const { router } = setupRouter(registerGetWatchRoute);
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCH_URL_TEMPLATE);

    await handler(
      EMPTY_CONTEXT,
      makeRequest(PND_WATCH_URL_TEMPLATE, { watchId: 'nonexistent-watch' }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns 404 when projection unavailable and mockData=false', async () => {
    const { router } = setupRouter(registerGetWatchRoute, {
      ui: { useMockData: false },
    });
    const response = makeResponse();
    const handler = router.getHandler(PND_WATCH_URL_TEMPLATE);

    await handler(
      EMPTY_CONTEXT,
      makeRequest(PND_WATCH_URL_TEMPLATE, { watchId: 'system-security-watch-deep' }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
  });
});
