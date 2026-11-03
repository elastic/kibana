/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getSession } from '../../sessions/get_session';
import { listSessions } from '../../sessions/list_sessions';
import { enableSessions, getSessionsStatus } from '../../sessions/sessions_setup';
import { SessionsNewerVersionError } from '../../sessions/sessions_newer_version_error';
import { SessionsPrivilegesError } from '../../sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../../sessions/sessions_restricted_read_error';
import {
  SESSIONS_ENABLE_ENDPOINT,
  SESSIONS_LIST_ENDPOINT,
  SESSIONS_STATUS_ENDPOINT,
  SESSION_DETAIL_ENDPOINT,
  sessionsRouteRepository,
} from './route';

jest.mock('../../sessions/get_session');
jest.mock('../../sessions/list_sessions');
jest.mock('../../sessions/sessions_setup', () => ({
  ...jest.requireActual('../../sessions/sessions_setup'),
  enableSessions: jest.fn(),
  getSessionsStatus: jest.fn(),
}));

type Endpoint = keyof typeof sessionsRouteRepository;

const settings = { frequency: '1m', partitions: 1 };

const status = {
  installed: true,
  health: 'healthy',
  state: 'started',
  installedVersion: 1,
  currentVersion: 1,
  needsUpdate: false,
  reason: null,
};

const START = '2026-10-27T10:00:00.000Z';
const END = '2026-10-28T10:00:00.000Z';

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: null,
    meta: {} as never,
  });

const runHandler = (
  endpoint: Endpoint,
  {
    params = {},
    authzResult,
  }: { params?: Record<string, unknown>; authzResult?: Record<string, boolean> } = {}
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  const logger = loggingSystemMock.createLogger();
  const handler = sessionsRouteRepository[endpoint].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  const result = handler({
    params,
    context: { core: Promise.resolve(coreContext) },
    request: { authzResult },
    logger,
    sessionsSettings: settings,
  });
  return { result, coreContext, logger };
};

/** The client error a handler threw: status code, message and attributes. */
const clientErrorOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => {
      throw new Error('expected the handler to throw');
    },
    (e) => e
  );
  expect(isBoom(error)).toBe(true);
  return { statusCode: error.output.statusCode, message: error.message, data: error.data };
};

const querySchemaOf = () =>
  (
    sessionsRouteRepository[SESSIONS_LIST_ENDPOINT].params as unknown as {
      shape: {
        query: {
          parse: (query: unknown) => Record<string, unknown>;
          safeParse: (query: unknown) => { success: boolean };
        };
      };
    }
  ).shape.query;

describe('sessions routes', () => {
  beforeEach(() => {
    jest.mocked(getSessionsStatus).mockResolvedValue(status as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each<[Endpoint, string]>([
    [SESSIONS_ENABLE_ENDPOINT, 'manage_digital_experience_sessions'],
    [SESSIONS_LIST_ENDPOINT, 'read_digital_experience'],
    [SESSION_DETAIL_ENDPOINT, 'read_digital_experience'],
  ])('%s requires %s', (endpoint, privilege) => {
    expect(sessionsRouteRepository[endpoint].security).toEqual({
      authz: { requiredPrivileges: [privilege] },
    });
  });

  it('requires read for status, and checks the manage sessions privilege to show the enabler', () => {
    expect(sessionsRouteRepository[SESSIONS_STATUS_ENDPOINT].security).toEqual({
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
        // The router fills `authzResult` from the route's extended privileges.
        const { result } = runHandler(SESSIONS_STATUS_ENDPOINT, {
          authzResult: { manage_digital_experience_sessions: canManage },
        });

        expect(await result).toEqual(body);
      }
    );

    it('answers 500 without the Elasticsearch details when the status read fails', async () => {
      jest.mocked(getSessionsStatus).mockRejectedValue(esError(500));
      const { result, logger } = runHandler(SESSIONS_STATUS_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual(
        expect.objectContaining({
          statusCode: 500,
          message: 'Could not load the sessions. Check the Kibana server logs for details.',
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('enable', () => {
    it('enables sessions as the current user, records them, audits it and returns the status', async () => {
      const { result, coreContext } = runHandler(SESSIONS_ENABLE_ENDPOINT);
      // The handler reads the user after awaiting the request context.
      coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);

      expect(await result).toEqual(status);
      expect(enableSessions).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: coreContext.elasticsearch.client,
          settings,
          enabledBy: 'ana',
        })
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
    });

    it.each([
      [
        'missing privileges',
        new SessionsPrivilegesError(['cluster:manage_transform']),
        403,
        { missingPrivileges: ['cluster:manage_transform'] },
      ],
      [
        'a filtered source read',
        new SessionsRestrictedReadError(['logs-*.otel-*'], 'filtered'),
        403,
        { restrictedIndices: ['logs-*.otel-*'], reason: 'filtered' },
      ],
      [
        'transforms from a newer version',
        new SessionsNewerVersionError(2, 1),
        409,
        { installedVersion: 2, currentVersion: 1 },
      ],
    ])('answers %s with its reason, and audits the failure', async (_name, error, code, data) => {
      jest.mocked(enableSessions).mockRejectedValue(error);
      const { result, coreContext } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual({
        statusCode: code,
        message: error.message,
        data,
      });
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
    });

    it('answers other failures with a 500 that hides the Elasticsearch details', async () => {
      jest.mocked(enableSessions).mockRejectedValue(new Error('security_exception: user [ana]'));
      const { result, logger } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      const error = await clientErrorOf(result);

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(
        'Could not enable sessions. Check the Kibana server logs for details.'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Could not enable sessions: security_exception: user [ana]'
      );
    });
  });

  it('lists sessions as the current user with facet selections', async () => {
    jest.mocked(listSessions).mockResolvedValue({ sessions: [] } as never);
    const { result, coreContext } = runHandler(SESSIONS_LIST_ENDPOINT, {
      params: {
        path: { serviceName: 'web' },
        query: {
          start: START,
          end: END,
          browser: 'Chrome',
          sortField: 'start_time',
          sortDirection: 'desc',
          page: 0,
          perPage: 25,
        },
      },
    });

    expect(await result).toEqual({ sessions: [] });
    expect(listSessions).toHaveBeenCalledWith(coreContext.elasticsearch.client.asCurrentUser, {
      serviceName: 'web',
      start: START,
      end: END,
      sortField: 'start_time',
      sortDirection: 'desc',
      page: 0,
      perPage: 25,
      facets: { browsers: 'Chrome', os: undefined, countries: undefined, entryPages: undefined },
    });
  });

  it('answers 404 for an unknown session', async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const { result, coreContext } = runHandler(SESSION_DETAIL_ENDPOINT, {
      params: { path: { serviceName: 'web', sessionId: 'abc' } },
    });

    expect(await clientErrorOf(result)).toEqual(
      expect.objectContaining({ statusCode: 404, message: 'Session [abc] not found' })
    );
    expect(getSession).toHaveBeenCalledWith(coreContext.elasticsearch.client.asCurrentUser, {
      serviceName: 'web',
      sessionId: 'abc',
    });
  });

  describe('list query validation', () => {
    const range = { start: START, end: '2026-10-28T10:00:00Z' };

    it('accepts ISO date-times, coerces paging and applies the defaults', () => {
      expect(querySchemaOf().parse({ ...range, page: '2' })).toEqual({
        ...range,
        sortField: 'start_time',
        sortDirection: 'desc',
        page: 2,
        perPage: 25,
      });
    });

    it.each(['yesterday', 'now-15m', '2026-10-27', '2026-13-45T10:00:00Z'])(
      'rejects %s as a date instead of failing in Elasticsearch',
      (start) => {
        expect(querySchemaOf().safeParse({ ...range, start }).success).toBe(false);
      }
    );

    it('rejects a start that is not before the end', () => {
      expect(querySchemaOf().safeParse({ start: range.end, end: range.start }).success).toBe(false);
    });

    it('only accepts the shared sort fields, and bounded paging', () => {
      expect(querySchemaOf().parse({ ...range, sortField: 'error_count' }).sortField).toBe(
        'error_count'
      );
      expect(querySchemaOf().safeParse({ ...range, sortField: 'user.key' }).success).toBe(false);
      expect(querySchemaOf().safeParse({ ...range, perPage: '101' }).success).toBe(false);
      expect(querySchemaOf().safeParse({ ...range, page: '1.5' }).success).toBe(false);
    });
  });

  it.each([
    ['list', SESSIONS_LIST_ENDPOINT, listSessions],
    ['detail', SESSION_DETAIL_ENDPOINT, getSession],
  ] as const)(
    'answers 403 naming the index privileges when Elasticsearch denies the %s read',
    async (_name, endpoint, read) => {
      jest.mocked(read).mockRejectedValue(esError(403));
      const { result } = runHandler(endpoint, {
        params: {
          path: { serviceName: 'web', sessionId: 'abc' },
          query: { start: START, end: END },
        },
      });

      const error = await clientErrorOf(result);

      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('read index privilege on digital-experience-sessions-*');
    }
  );

  it('answers other Elasticsearch errors with a 500 and logs them', async () => {
    jest.mocked(getSession).mockRejectedValue(esError(500));
    const { result, logger } = runHandler(SESSION_DETAIL_ENDPOINT, {
      params: { path: { serviceName: 'web', sessionId: 'abc' } },
    });

    expect((await clientErrorOf(result)).statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not load session [abc]')
    );
  });
});
