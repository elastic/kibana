/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  SESSIONS_LOOKBACK_DAYS,
  type SessionsStatus,
  type SessionsStatusResponse,
} from '../../../common/sessions';
import {
  NO_ENCRYPTION_KEY_MESSAGE,
  SessionsEnableError,
  canEnableSessions,
  enableSessions,
  type SessionsEnableStep,
} from '../../services/sessions/enable_sessions';
import { SessionsPrivilegesError } from '../../services/sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../../services/sessions/sessions_restricted_read_error';
import {
  BROWSER_SESSIONS_PLATFORM,
  MOBILE_SESSIONS_PLATFORM,
  SESSIONS_PLATFORMS,
} from '../../services/sessions/sessions_platforms';
import { getSessionsStatusResponse } from '../../services/sessions/sessions_status';
import { disableSessions } from '../../services/sessions/disable_sessions';
import { canManageSessionsInAllSpaces } from '../../services/sessions/manage_sessions_privilege';
import type { SessionsServices } from '../create_digital_experience_server_route';
import { getSession } from './get_session';
import { listSessions } from './list_sessions';
import {
  SESSIONS_DISABLE_ENDPOINT,
  SESSIONS_ENABLE_ENDPOINT,
  SESSIONS_LIST_ENDPOINT,
  SESSIONS_STATUS_ENDPOINT,
  SESSION_DETAIL_ENDPOINT,
  sessionsRouteRepository,
} from './route';

jest.mock('./get_session');
jest.mock('./list_sessions');
jest.mock('../../services/sessions/sessions_status');
jest.mock('../../services/sessions/disable_sessions');
jest.mock('../../services/sessions/manage_sessions_privilege');
jest.mock('../../services/sessions/enable_sessions', () => ({
  ...jest.requireActual('../../services/sessions/enable_sessions'),
  enableSessions: jest.fn(),
  canEnableSessions: jest.fn(),
}));

type Endpoint = keyof typeof sessionsRouteRepository;

const settings = { frequency: '1m' };

const browserStatus: SessionsStatus = {
  installed: true,
  disabled: false,
  health: 'healthy',
  installedVersion: 1,
  currentVersion: 1,
  rebuilding: false,
  apiKeyInvalid: false,
  lagSeconds: 90,
  summarizedUntil: '2026-10-27T11:58:30.000Z',
  lastRunAt: '2026-10-27T11:59:30.000Z',
  lastSuccessAt: '2026-10-27T11:59:30.000Z',
  lastError: null,
  enabledBy: 'ana',
  retentionDays: SESSIONS_LOOKBACK_DAYS,
  autoEnable: false,
  canManage: true,
  setUpBlocker: null,
};
const withMobile = (browser: SessionsStatus): SessionsStatusResponse => ({
  ...browser,
  mobile: { ...browserStatus, health: 'lagging' },
});
const missingStatus: SessionsStatus = { ...browserStatus, installed: false, health: 'missing' };
const status = withMobile(browserStatus);
const notSetUp: SessionsStatusResponse = { ...missingStatus, mobile: missingStatus };
const mobileMissing: SessionsStatusResponse = { ...browserStatus, mobile: missingStatus };
const turnedOff = withMobile({ ...browserStatus, disabled: true, health: 'disabled' });
const keyInvalid = withMobile({ ...browserStatus, apiKeyInvalid: true, health: 'degraded' });
const asManager = { manage_digital_experience_sessions: true };

const LOAD_FAILED_MESSAGE =
  'Could not load the sessions. Check the Kibana server logs for details.';

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
    services = {
      taskManager: taskManagerMock.createStart(),
      canEncrypt: true,
      authz: undefined,
    },
  }: {
    params?: Record<string, unknown>;
    authzResult?: Record<string, boolean>;
    services?: SessionsServices;
  } = {}
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  coreContext.featureFlags.getBooleanValue.mockResolvedValue(true);
  const logger = loggingSystemMock.createLogger();
  const handler = sessionsRouteRepository[endpoint].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  const request = { authzResult };
  const result = handler({
    params,
    context: { core: Promise.resolve(coreContext) },
    request,
    logger,
    sessionsSettings: settings,
    getSessionsServices: async () => services,
    isServerless: true,
  });
  return { result, coreContext, logger, request, services };
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
    jest.mocked(getSessionsStatusResponse).mockResolvedValue(status);
    jest.mocked(enableSessions).mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each<[Endpoint, string]>([
    [SESSIONS_DISABLE_ENDPOINT, 'manage_digital_experience_sessions'],
    [SESSIONS_LIST_ENDPOINT, 'read_digital_experience'],
    [SESSION_DETAIL_ENDPOINT, 'read_digital_experience'],
  ])('%s requires %s', (endpoint, privilege) => {
    expect(sessionsRouteRepository[endpoint].security).toEqual({
      authz: { requiredPrivileges: [privilege] },
    });
  });

  it.each<Endpoint>([SESSIONS_STATUS_ENDPOINT, SESSIONS_ENABLE_ENDPOINT])(
    '%s requires read, and checks the manage sessions privilege for the details',
    (endpoint) => {
      expect(sessionsRouteRepository[endpoint].security).toEqual({
        authz: {
          requiredPrivileges: ['read_digital_experience'],
          extendedPrivileges: ['manage_digital_experience_sessions'],
        },
      });
    }
  );

  describe('status', () => {
    it.each([true, false])(
      'reads the details of the status only for managers in all spaces (manager: %s)',
      async (canManage) => {
        jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(canManage);
        const { result, request, services } = runHandler(SESSIONS_STATUS_ENDPOINT);

        expect(await result).toEqual(status);
        expect(canManageSessionsInAllSpaces).toHaveBeenCalledWith(services.authz, request);
        expect(getSessionsStatusResponse).toHaveBeenCalledWith({
          taskManager: services.taskManager,
          settings,
          canManage,
        });
      }
    );

    it('reads the status without Task Manager, which reports sessions missing', async () => {
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(false);
      const { result } = runHandler(SESSIONS_STATUS_ENDPOINT, {
        services: {
          taskManager: undefined,
          canEncrypt: true,
          authz: undefined,
        },
      });

      await result;

      expect(getSessionsStatusResponse).toHaveBeenCalledWith({
        taskManager: undefined,
        settings,
        canManage: false,
      });
    });

    describe('autoEnable', () => {
      it.each<[string, SessionsStatusResponse, boolean]>([
        ['sessions are not set up', notSetUp, true],
        ['sessions are not set up', notSetUp, false],
        ['the API key no longer works', keyInvalid, true],
      ])(
        'tells any reader whether the app can set sessions up for them when %s (can enable: %s)',
        async (_name, sessionsStatus, canEnable) => {
          jest.mocked(getSessionsStatusResponse).mockResolvedValue(sessionsStatus);
          jest.mocked(canEnableSessions).mockResolvedValue(canEnable);
          const { result, coreContext, logger } = runHandler(SESSIONS_STATUS_ENDPOINT);

          expect(await result).toEqual({ ...sessionsStatus, autoEnable: canEnable });
          expect(canEnableSessions).toHaveBeenCalledWith({
            client: coreContext.elasticsearch.client.asCurrentUser,
            canEncrypt: true,
            isServerless: true,
            logger,
          });
        }
      );

      it.each<[string, SessionsStatusResponse, SessionsServices['taskManager']]>([
        ['sessions are set up', status, taskManagerMock.createStart()],
        [
          'sessions were turned off',
          { ...turnedOff, apiKeyInvalid: true },
          taskManagerMock.createStart(),
        ],
      ])('does not check the privileges when %s', async (_name, sessionsStatus, taskManager) => {
        jest.mocked(getSessionsStatusResponse).mockResolvedValue(sessionsStatus);
        const { result } = runHandler(SESSIONS_STATUS_ENDPOINT, {
          authzResult: asManager,
          services: { taskManager, canEncrypt: true, authz: undefined },
        });

        expect(await result).toEqual(sessionsStatus);
        expect(canEnableSessions).not.toHaveBeenCalled();
      });

      it('offers to set up the mobile sessions alone when only they are missing', async () => {
        jest.mocked(getSessionsStatusResponse).mockResolvedValue(mobileMissing);
        jest.mocked(canEnableSessions).mockResolvedValue(true);
        const { result } = runHandler(SESSIONS_STATUS_ENDPOINT);

        expect(await result).toEqual({ ...mobileMissing, autoEnable: true });
      });

      it('never offers to set up the mobile sessions once sessions were turned off', async () => {
        jest
          .mocked(getSessionsStatusResponse)
          .mockResolvedValue({ ...turnedOff, mobile: missingStatus });
        const { result } = runHandler(SESSIONS_STATUS_ENDPOINT);

        expect(await result).toMatchObject({ autoEnable: false });
        expect(canEnableSessions).not.toHaveBeenCalled();
      });

      it.each<[string, SessionsServices, string]>([
        [
          'there is no Task Manager',
          { taskManager: undefined, canEncrypt: true, authz: undefined },
          'taskManager',
        ],
        [
          'Kibana cannot store the API key',
          { taskManager: taskManagerMock.createStart(), canEncrypt: false, authz: undefined },
          'encryptionKey',
        ],
      ])(
        'tells everyone why nobody can set sessions up when %s',
        async (_name, services, blocker) => {
          jest.mocked(getSessionsStatusResponse).mockResolvedValue(notSetUp);
          const { result } = runHandler(SESSIONS_STATUS_ENDPOINT, { services });

          expect(await result).toEqual({ ...notSetUp, setUpBlocker: blocker });
          expect(canEnableSessions).not.toHaveBeenCalled();
        }
      );
    });

    it('answers 500 without the details when the status read fails', async () => {
      jest.mocked(getSessionsStatusResponse).mockRejectedValue(esError(500));
      const { result, logger } = runHandler(SESSIONS_STATUS_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual(
        expect.objectContaining({ statusCode: 500, message: LOAD_FAILED_MESSAGE })
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not read the sessions status')
      );
    });
  });

  describe('enable', () => {
    beforeEach(() => {
      // Read before enabling, to tell who may; then once enabled.
      jest.mocked(getSessionsStatusResponse).mockResolvedValueOnce(notSetUp);
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(false);
    });

    it('enables sessions for the current user, audits it and returns the status', async () => {
      const { result, coreContext, request, logger, services } =
        runHandler(SESSIONS_ENABLE_ENDPOINT);
      // The handler reads the user after awaiting the request context.
      coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);

      expect(await result).toEqual(status);
      expect(enableSessions).toHaveBeenCalledWith({
        esClient: coreContext.elasticsearch.client,
        request,
        taskManager: services.taskManager,
        canEncrypt: true,
        settings,
        isServerless: true,
        logger,
        platforms: SESSIONS_PLATFORMS,
      });
      expect(getSessionsStatusResponse).toHaveBeenCalledWith({
        taskManager: services.taskManager,
        settings,
        canManage: false,
      });
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith({
        message: 'User [ana] enabled Digital Experience sessions',
        event: {
          action: 'digital_experience_sessions_enable',
          category: ['configuration'],
          type: ['change'],
          outcome: 'success',
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Sessions enabled by [ana]');
    });

    it('returns the details of the status to managers', async () => {
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(true);
      const { result, services } = runHandler(SESSIONS_ENABLE_ENDPOINT, {
        authzResult: asManager,
      });

      await result;

      expect(getSessionsStatusResponse).toHaveBeenLastCalledWith({
        taskManager: services.taskManager,
        settings,
        canManage: true,
      });
    });

    it('gives sessions a working API key again for any reader', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValueOnce(keyInvalid);
      jest.mocked(getSessionsStatusResponse).mockResolvedValue(status);
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect(await result).toEqual(status);
      expect(enableSessions).toHaveBeenCalledWith(
        expect.objectContaining({ platforms: [BROWSER_SESSIONS_PLATFORM] })
      );
    });

    it('sets up only the missing mobile sessions for any reader, keeping the browser key', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValueOnce(mobileMissing);
      jest.mocked(getSessionsStatusResponse).mockResolvedValue(status);
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect(await result).toEqual(status);
      expect(enableSessions).toHaveBeenCalledWith(
        expect.objectContaining({ platforms: [MOBILE_SESSIONS_PLATFORM] })
      );
    });

    it('leaves working sessions as they are for a user who does not manage them', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValue(status);
      const { result, request, services } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect(await result).toEqual(status);
      expect(canManageSessionsInAllSpaces).toHaveBeenCalledWith(services.authz, request);
      expect(enableSessions).not.toHaveBeenCalled();
    });

    it('lets a manager in all spaces replace the API key of working sessions', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValue(status);
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(true);
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT, { authzResult: asManager });

      await result;

      expect(enableSessions).toHaveBeenCalledWith(
        expect.objectContaining({ platforms: SESSIONS_PLATFORMS })
      );
    });

    it('answers 403 when a user who does not manage sessions in all spaces turns them back on', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValue(turnedOff);
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT, { authzResult: asManager });

      expect(await clientErrorOf(result)).toEqual(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('Sessions were turned off'),
        })
      );
      expect(enableSessions).not.toHaveBeenCalled();
    });

    it('turns sessions back on for a manager in all spaces', async () => {
      jest.mocked(getSessionsStatusResponse).mockReset().mockResolvedValueOnce(turnedOff);
      jest.mocked(getSessionsStatusResponse).mockResolvedValue(status);
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(true);
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT, { authzResult: asManager });

      expect(await result).toEqual(status);
      expect(enableSessions).toHaveBeenCalled();
    });

    it('passes on whether Kibana can store the API key', async () => {
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT, {
        services: {
          taskManager: taskManagerMock.createStart(),
          canEncrypt: false,
          authz: undefined,
        },
      });

      await result;

      expect(enableSessions).toHaveBeenCalledWith(expect.objectContaining({ canEncrypt: false }));
    });

    it('answers 500 without Task Manager, which builds the session summaries', async () => {
      const { result } = runHandler(SESSIONS_ENABLE_ENDPOINT, {
        services: {
          taskManager: undefined,
          canEncrypt: true,
          authz: undefined,
        },
      });

      expect(await clientErrorOf(result)).toEqual(
        expect.objectContaining({
          statusCode: 500,
          message: expect.stringContaining('need the Task Manager plugin'),
        })
      );
      expect(enableSessions).not.toHaveBeenCalled();
    });

    it.each([
      [
        'missing privileges',
        new SessionsPrivilegesError(['index:logs-*.otel-*:read']),
        { missingPrivileges: ['index:logs-*.otel-*:read'] },
      ],
      [
        'a filtered source read',
        new SessionsRestrictedReadError(['logs-*.otel-*'], 'filtered'),
        { restrictedIndices: ['logs-*.otel-*'], reason: 'filtered' },
      ],
    ])(
      'answers %s with a 403 and its reason, and audits the failure',
      async (_name, error, data) => {
        jest.mocked(enableSessions).mockRejectedValue(error);
        const { result, coreContext } = runHandler(SESSIONS_ENABLE_ENDPOINT);
        coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);

        expect(await clientErrorOf(result)).toEqual({
          statusCode: 403,
          message: error.message,
          data,
        });
        expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed attempt by user [ana] to enable Digital Experience sessions',
            event: expect.objectContaining({ outcome: 'failure' }),
            error: { code: error.name, message: error.message },
          })
        );
      }
    );

    it.each<[SessionsEnableStep, string]>([
      ['credentials', NO_ENCRYPTION_KEY_MESSAGE],
      ['template', 'putting the sessions index template failed'],
      ['index', 'creating the sessions index failed'],
      ['task', 'scheduling the summaries task with an API key on your behalf failed'],
    ])('answers a failed %s step with a 500 naming it', async (step, message) => {
      jest
        .mocked(enableSessions)
        .mockRejectedValue(new SessionsEnableError(step, new Error('security_exception: [ana]')));
      const { result, logger, coreContext } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      const error = await clientErrorOf(result);

      expect(error).toEqual({
        statusCode: 500,
        message: expect.stringContaining(message),
        data: { step },
      });
      expect(error.message).not.toContain('security_exception');
      expect(logger.error).toHaveBeenCalledWith(
        `Could not enable sessions: Enabling sessions failed at the ${step} step: security_exception: [ana]`
      );
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
    });

    it('answers other failures with a 500 that hides the details', async () => {
      jest.mocked(enableSessions).mockRejectedValue(new Error('security_exception: user [ana]'));
      const { result, logger } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual({
        statusCode: 500,
        message: 'Could not enable sessions. Check the Kibana server logs for details.',
        data: null,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Could not enable sessions: security_exception: user [ana]'
      );
    });

    it('answers 403 when the user cannot read the status after enabling', async () => {
      jest.mocked(getSessionsStatusResponse).mockRejectedValueOnce(esError(403));
      const { result, coreContext } = runHandler(SESSIONS_ENABLE_ENDPOINT);

      expect((await clientErrorOf(result)).statusCode).toBe(403);
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'success' }) })
      );
    });
  });

  describe('disable', () => {
    beforeEach(() => {
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(true);
      jest.mocked(disableSessions).mockResolvedValue(true);
      jest.mocked(getSessionsStatusResponse).mockResolvedValue(turnedOff);
    });

    it('turns sessions off, audits it and returns the status with its details', async () => {
      const { result, coreContext, request, logger, services } =
        runHandler(SESSIONS_DISABLE_ENDPOINT);
      coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);

      expect(await result).toEqual(turnedOff);
      expect(canManageSessionsInAllSpaces).toHaveBeenCalledWith(services.authz, request);
      expect(disableSessions).toHaveBeenCalledWith({ taskManager: services.taskManager, request });
      expect(getSessionsStatusResponse).toHaveBeenCalledWith({
        taskManager: services.taskManager,
        settings,
        canManage: true,
      });
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith({
        message: 'User [ana] disabled Digital Experience sessions',
        event: {
          action: 'digital_experience_sessions_disable',
          category: ['configuration'],
          type: ['change'],
          outcome: 'success',
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Sessions disabled by [ana]');
    });

    it('answers 403 when the user does not manage sessions in all spaces', async () => {
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(false);
      const { result } = runHandler(SESSIONS_DISABLE_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining('all spaces') })
      );
      expect(disableSessions).not.toHaveBeenCalled();
    });

    it('answers 404 when sessions were never set up', async () => {
      jest.mocked(disableSessions).mockResolvedValue(false);
      const { result } = runHandler(SESSIONS_DISABLE_ENDPOINT);

      expect((await clientErrorOf(result)).statusCode).toBe(404);
    });

    it('answers a failure with a 500 that hides the details, and audits it', async () => {
      jest.mocked(disableSessions).mockRejectedValue(new Error('security_exception: [ana]'));
      const { result, logger, coreContext } = runHandler(SESSIONS_DISABLE_ENDPOINT);

      expect(await clientErrorOf(result)).toEqual({
        statusCode: 500,
        message: 'Could not turn sessions off. Check the Kibana server logs for details.',
        data: null,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Could not disable sessions: security_exception: [ana]'
      );
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
    });

    it('answers 500 without Task Manager', async () => {
      const { result } = runHandler(SESSIONS_DISABLE_ENDPOINT, {
        services: { taskManager: undefined, canEncrypt: true, authz: undefined },
      });

      expect((await clientErrorOf(result)).statusCode).toBe(500);
      expect(disableSessions).not.toHaveBeenCalled();
    });
  });

  it('lists sessions as the current user with the environment, facets and filters', async () => {
    jest.mocked(listSessions).mockResolvedValue({ sessions: [] } as never);
    const { result, coreContext } = runHandler(SESSIONS_LIST_ENDPOINT, {
      params: {
        path: { serviceName: 'web' },
        query: {
          start: START,
          end: END,
          environment: 'production',
          browser: 'Chrome',
          withJsErrors: true,
          withFailedRequests: false,
          minDurationMs: 10_000,
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
      environment: 'production',
      sortField: 'start_time',
      sortDirection: 'desc',
      page: 0,
      perPage: 25,
      facets: { browsers: 'Chrome', os: undefined, countries: undefined, entryPages: undefined },
      filters: {
        withJsErrors: true,
        withFailedRequests: false,
        minDurationMs: 10_000,
        maxDurationMs: undefined,
      },
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

    it('parses the error and duration filters', () => {
      expect(
        querySchemaOf().parse({
          ...range,
          withJsErrors: 'true',
          withFailedRequests: 'false',
          minDurationMs: '10000',
          maxDurationMs: '60000',
        })
      ).toMatchObject({
        withJsErrors: true,
        withFailedRequests: false,
        minDurationMs: 10_000,
        maxDurationMs: 60_000,
      });
      expect(querySchemaOf().safeParse({ ...range, withJsErrors: 'yes please' }).success).toBe(
        false
      );
      expect(querySchemaOf().safeParse({ ...range, hasErrors: 'true' })).toEqual(
        expect.objectContaining({ success: true })
      );
      expect(querySchemaOf().parse({ ...range, hasErrors: 'true' })).not.toHaveProperty(
        'hasErrors'
      );
      expect(querySchemaOf().safeParse({ ...range, minDurationMs: '-1' }).success).toBe(false);
      expect(
        querySchemaOf().safeParse({ ...range, minDurationMs: '60000', maxDurationMs: '60000' })
          .success
      ).toBe(false);
    });

    it('accepts an environment up to 1024 characters', () => {
      const withEnvironment = (length: number) =>
        querySchemaOf().safeParse({ ...range, environment: 'x'.repeat(length) }).success;

      expect(withEnvironment(1024)).toBe(true);
      expect(withEnvironment(1025)).toBe(false);
      expect(withEnvironment(0)).toBe(false);
    });

    it('only accepts the shared sort fields, and bounded paging', () => {
      expect(querySchemaOf().parse({ ...range, sortField: 'js_error_count' }).sortField).toBe(
        'js_error_count'
      );
      expect(
        querySchemaOf().parse({ ...range, sortField: 'http_failed_request_count' }).sortField
      ).toBe('http_failed_request_count');
      expect(querySchemaOf().safeParse({ ...range, sortField: 'error_count' }).success).toBe(false);
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
