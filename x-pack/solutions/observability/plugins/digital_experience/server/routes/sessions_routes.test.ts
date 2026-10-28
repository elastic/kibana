/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';
import type { RequestHandler, RequestHandlerContext, RouteConfig } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { getSession } from '../sessions/get_session';
import { listSessions } from '../sessions/list_sessions';
import { enableSessions, getSessionsStatus } from '../sessions/sessions_setup';
import { SessionsPrivilegesError } from '../sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../sessions/sessions_restricted_read_error';
import { SESSIONS_API_BASE_PATH, registerSessionsRoutes } from './sessions_routes';

jest.mock('../sessions/get_session');
jest.mock('../sessions/list_sessions');
jest.mock('../sessions/sessions_setup', () => ({
  ...jest.requireActual('../sessions/sessions_setup'),
  enableSessions: jest.fn(),
  getSessionsStatus: jest.fn(),
}));

const status = {
  installed: true,
  health: 'healthy',
  state: 'started',
  installedVersion: 1,
  currentVersion: 1,
  needsUpdate: false,
  reason: null,
};

type Method = 'get' | 'post';

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: null,
    meta: {} as never,
  });

const setup = () => {
  const router = httpServiceMock.createRouter();
  registerSessionsRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    settings: { frequency: '1m', partitions: 1 },
  });
  const coreContext = coreMock.createRequestHandlerContext();
  const context = { core: Promise.resolve(coreContext) } as unknown as RequestHandlerContext;

  const route = (method: Method, path: string) => {
    const call = router[method].mock.calls.find(([config]) => config.path === path);
    if (!call) {
      throw new Error(`Route ${method.toUpperCase()} ${path} not registered`);
    }
    return {
      config: call[0] as RouteConfig<unknown, unknown, unknown, Method>,
      handler: call[1] as RequestHandler<unknown, unknown, unknown>,
    };
  };

  return { coreContext, context, route };
};

describe('sessions routes', () => {
  beforeEach(() => {
    jest.mocked(getSessionsStatus).mockResolvedValue(status as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each<[Method, string, string]>([
    ['post', `${SESSIONS_API_BASE_PATH}/sessions/enable`, 'manage_digital_experience_sessions'],
    [
      'get',
      `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions`,
      'read_digital_experience',
    ],
    [
      'get',
      `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions/{sessionId}`,
      'read_digital_experience',
    ],
  ])('%s %s requires %s', (method, path, privilege) => {
    const { config } = setup().route(method, path);
    expect(config.security).toEqual({ authz: { requiredPrivileges: [privilege] } });
  });

  it('requires read for status, and checks the manage sessions privilege to show the enabler', () => {
    const { config } = setup().route('get', `${SESSIONS_API_BASE_PATH}/sessions/status`);
    expect(config.security).toEqual({
      authz: {
        requiredPrivileges: ['read_digital_experience'],
        extendedPrivileges: ['manage_digital_experience_sessions'],
      },
    });
  });

  describe('status', () => {
    const enabled = {
      ...status,
      enabledBy: 'ana',
      enabledAt: '2026-10-27T11:00:00.000Z',
      authorization: { roles: ['superuser'], apiKeyName: null, serviceAccount: null },
      transforms: [
        {
          id: 'digital-experience-sessions-1',
          enabledBy: 'ana',
          enabledAt: '2026-10-27T11:00:00.000Z',
          authorization: { roles: ['superuser'], apiKeyName: null, serviceAccount: null },
        },
      ],
    };

    it.each([
      [true, enabled],
      [
        false,
        {
          ...enabled,
          enabledBy: null,
          enabledAt: null,
          authorization: null,
          transforms: [
            {
              id: 'digital-experience-sessions-1',
              enabledBy: null,
              enabledAt: null,
              authorization: null,
            },
          ],
        },
      ],
    ])(
      'shows who enabled sessions only to managers (manage sessions: %s)',
      async (canManage, body) => {
        jest.mocked(getSessionsStatus).mockResolvedValue(enabled as never);
        const { context, route } = setup();
        const response = httpServerMock.createResponseFactory();
        // The router fills `authzResult` from the route's extended privileges.
        const request = Object.assign(httpServerMock.createKibanaRequest(), {
          authzResult: { manage_digital_experience_sessions: canManage },
        });

        await route('get', `${SESSIONS_API_BASE_PATH}/sessions/status`).handler(
          context,
          request,
          response
        );

        expect(response.ok).toHaveBeenCalledWith({ body });
      }
    );
  });

  it('enables sessions as the current user, records them, audits it and returns the status', async () => {
    const { coreContext, context, route } = setup();
    coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);
    const { handler } = route('post', `${SESSIONS_API_BASE_PATH}/sessions/enable`);
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(enableSessions).toHaveBeenCalledWith(
      expect.objectContaining({ esClient: coreContext.elasticsearch.client, enabledBy: 'ana' })
    );
    expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User [ana] enabled Digital Experience sessions',
        event: expect.objectContaining({
          action: 'digital_experience_sessions_enable',
          outcome: 'success',
        }),
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('returns 403, and audits the failure, when the source read is filtered', async () => {
    jest
      .mocked(enableSessions)
      .mockRejectedValue(new SessionsRestrictedReadError(['logs-*.otel-*'], 'filtered'));
    const { coreContext, context, route } = setup();
    const response = httpServerMock.createResponseFactory();

    await route('post', `${SESSIONS_API_BASE_PATH}/sessions/enable`).handler(
      context,
      httpServerMock.createKibanaRequest(),
      response
    );

    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('without document- or field-level security'),
        attributes: { restrictedIndices: ['logs-*.otel-*'], reason: 'filtered' },
      },
    });
    expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
    );
  });

  it('returns 403 with the missing privileges instead of a partial setup', async () => {
    jest
      .mocked(enableSessions)
      .mockRejectedValue(new SessionsPrivilegesError(['cluster:manage_transform']));
    const { context, route } = setup();
    const { handler } = route('post', `${SESSIONS_API_BASE_PATH}/sessions/enable`);
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({
        attributes: { missingPrivileges: ['cluster:manage_transform'] },
      }),
    });
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('lists sessions as the current user with facet selections', async () => {
    jest.mocked(listSessions).mockResolvedValue({ sessions: [] } as never);
    const { coreContext, context, route } = setup();
    const { handler } = route(
      'get',
      `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions`
    );
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      params: { serviceName: 'web' },
      query: {
        start: '2026-10-27T10:00:00.000Z',
        end: '2026-10-28T10:00:00.000Z',
        browser: 'Chrome',
        sortField: 'start_time',
        sortDirection: 'desc',
        page: 0,
        perPage: 25,
      },
    });

    await handler(context, request, response);

    expect(listSessions).toHaveBeenCalledWith(coreContext.elasticsearch.client.asCurrentUser, {
      serviceName: 'web',
      start: '2026-10-27T10:00:00.000Z',
      end: '2026-10-28T10:00:00.000Z',
      sortField: 'start_time',
      sortDirection: 'desc',
      page: 0,
      perPage: 25,
      facets: { browsers: 'Chrome', os: undefined, countries: undefined, entryPages: undefined },
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { sessions: [] } });
  });

  it('returns 404 for an unknown session', async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const { coreContext, context, route } = setup();
    const { handler } = route(
      'get',
      `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions/{sessionId}`
    );
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      params: { serviceName: 'web', sessionId: 'abc' },
    });

    await handler(context, request, response);

    expect(getSession).toHaveBeenCalledWith(coreContext.elasticsearch.client.asCurrentUser, {
      serviceName: 'web',
      sessionId: 'abc',
    });
    expect(response.notFound).toHaveBeenCalled();
  });

  describe('list query validation', () => {
    const validateQuery = (query: Record<string, unknown>) => {
      const { config } = setup().route(
        'get',
        `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions`
      );
      return (config.validate as { query: Type<Record<string, unknown>> }).query.validate(query);
    };
    const range = { start: '2026-10-27T10:00:00.000Z', end: '2026-10-28T10:00:00Z' };

    it('accepts ISO date-times and applies the sort defaults', () => {
      expect(validateQuery(range)).toEqual(
        expect.objectContaining({ ...range, sortField: 'start_time', sortDirection: 'desc' })
      );
    });

    it.each(['yesterday', 'now-15m', '2026-10-27', '2026-13-45T10:00:00Z'])(
      'rejects %s as a date instead of failing in Elasticsearch',
      (start) => {
        expect(() => validateQuery({ ...range, start })).toThrow('must be an ISO 8601 date-time');
      }
    );

    it('rejects a start that is not before the end', () => {
      expect(() => validateQuery({ start: range.end, end: range.start })).toThrow(
        '`start` must be before `end`'
      );
    });

    it('only accepts the shared sort fields', () => {
      expect(validateQuery({ ...range, sortField: 'error_count' }).sortField).toBe('error_count');
      expect(() => validateQuery({ ...range, sortField: 'user.key' })).toThrow();
    });
  });

  it.each([
    ['list', `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions`, listSessions],
    [
      'detail',
      `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions/{sessionId}`,
      getSession,
    ],
  ] as const)(
    'returns 403 naming the index privileges when Elasticsearch denies the %s read',
    async (_name, path, read) => {
      jest.mocked(read).mockRejectedValue(esError(403));
      const { context, route } = setup();
      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({
        params: { serviceName: 'web', sessionId: 'abc' },
        query: { start: '2026-10-27T10:00:00.000Z', end: '2026-10-28T10:00:00.000Z' },
      });

      await route('get', path).handler(context, request, response);

      expect(response.forbidden).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('read index privilege on digital-experience-sessions-*'),
        },
      });
    }
  );

  it('rethrows other Elasticsearch errors', async () => {
    jest.mocked(getSession).mockRejectedValue(esError(500));
    const { context, route } = setup();
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      params: { serviceName: 'web', sessionId: 'abc' },
    });

    await expect(
      route(
        'get',
        `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions/{sessionId}`
      ).handler(context, request, response)
    ).rejects.toThrow();
    expect(response.forbidden).not.toHaveBeenCalled();
  });
});
