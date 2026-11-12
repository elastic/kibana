/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { canManageSessionsInAllSpaces } from '../../services/sessions/manage_sessions_privilege';
import type { SessionsServices } from '../create_digital_experience_server_route';
import {
  SESSIONS_SETTINGS_ENDPOINT,
  SESSIONS_SETTINGS_UPDATE_ENDPOINT,
  sessionsSettingsRouteRepository,
} from './settings_route';

jest.mock('../../services/sessions/manage_sessions_privilege');

type Endpoint = keyof typeof sessionsSettingsRouteRepository;

const TYPE = 'digital-experience-sessions-settings';
const ID = 'digital-experience-sessions-settings';
const DEFAULTS = { frequency: '1m', concurrency: 2 };

const savedObject = <T>(attributes: T) => ({
  id: ID,
  type: TYPE,
  references: [],
  attributes,
});

const runHandler = (
  endpoint: Endpoint,
  {
    params = {},
    saved = {},
    services = { taskManager: taskManagerMock.createStart(), canEncrypt: true, authz: undefined },
  }: {
    params?: Record<string, unknown>;
    /** The settings saved before the request; `null` for none, as `undefined` takes the default. */
    saved?: Record<string, unknown> | null;
    services?: SessionsServices;
  } = {}
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  coreContext.featureFlags.getBooleanValue.mockResolvedValue(true);
  coreContext.security.authc.getCurrentUser.mockReturnValue({ username: 'ana' } as never);
  const client = savedObjectsClientMock.create();
  coreContext.savedObjects.getClient = jest.fn(() => client);
  if (saved !== null) {
    client.get.mockResolvedValue(savedObject(saved));
  } else {
    client.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, ID));
  }
  client.create.mockImplementation(async (_type, attributes) => savedObject(attributes));
  const logger = loggingSystemMock.createLogger();
  const request = { authzResult: { manage_digital_experience_sessions: true } };
  const handler = sessionsSettingsRouteRepository[endpoint].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  const result = handler({
    params,
    context: { core: Promise.resolve(coreContext) },
    request,
    logger,
    sessionsSettingsDefaults: DEFAULTS,
    getSessionsServices: async () => services,
  });
  return { result, coreContext, client, logger, services, request };
};

const bodySchemaOf = () =>
  (
    sessionsSettingsRouteRepository[SESSIONS_SETTINGS_UPDATE_ENDPOINT].params as unknown as {
      shape: { body: { safeParse: (body: unknown) => { success: boolean } } };
    }
  ).shape.body;

describe('sessions settings routes', () => {
  beforeEach(() => {
    jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each<Endpoint>([SESSIONS_SETTINGS_ENDPOINT, SESSIONS_SETTINGS_UPDATE_ENDPOINT])(
    '%s requires the privilege to set sessions up, which `all` does not grant',
    (endpoint) => {
      expect(sessionsSettingsRouteRepository[endpoint].security).toEqual({
        authz: { requiredPrivileges: ['manage_digital_experience_sessions'] },
      });
    }
  );

  describe('get', () => {
    it('reads the saved settings as the user, over the kibana.yml ones, with those', async () => {
      const { result, coreContext, client } = runHandler(SESSIONS_SETTINGS_ENDPOINT, {
        saved: { concurrency: 4 },
      });

      expect(await result).toEqual({
        settings: { frequency: '1m', concurrency: 4 },
        defaults: DEFAULTS,
      });
      expect(coreContext.savedObjects.getClient).toHaveBeenCalledWith({
        includedHiddenTypes: [TYPE],
      });
      expect(client.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('answers the kibana.yml settings before any are saved', async () => {
      const { result, client } = runHandler(SESSIONS_SETTINGS_ENDPOINT, { saved: null });

      expect(await result).toEqual({ settings: DEFAULTS, defaults: DEFAULTS });
      // The saved object was missing, not empty.
      await expect(client.get.mock.results[0].value).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('update', () => {
    it('saves the settings, audits and logs the change, and runs the task with a new frequency', async () => {
      const { result, coreContext, client, logger, services } = runHandler(
        SESSIONS_SETTINGS_UPDATE_ENDPOINT,
        { params: { body: { frequency: '5m', concurrency: 4 } } }
      );

      expect(await result).toEqual({
        settings: { frequency: '5m', concurrency: 4 },
        defaults: DEFAULTS,
      });
      expect(client.create).toHaveBeenCalledWith(
        TYPE,
        { frequency: '5m', concurrency: 4 },
        { id: ID, overwrite: true }
      );
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith({
        message:
          'User [ana] changed the Digital Experience session summaries settings to frequency [5m] and concurrency [4]',
        event: {
          action: 'digital_experience_sessions_settings_update',
          category: ['configuration'],
          type: ['change'],
          outcome: 'success',
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Session summaries settings changed by [ana]: frequency [5m], concurrency [4]'
      );
      // Every platform's task runs with the settings.
      expect(jest.mocked(services.taskManager?.runSoon)?.mock.calls).toEqual([
        ['digital_experience:sessions-summaries'],
        ['digital_experience:mobile-sessions-summaries'],
      ]);
    });

    it('saves the first settings over kibana.yml when none were saved', async () => {
      const { result, client, services } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        saved: null,
        params: { body: { frequency: '5m' } },
      });

      expect(await result).toEqual({
        settings: { frequency: '5m', concurrency: 2 },
        defaults: DEFAULTS,
      });
      expect(client.create).toHaveBeenCalledWith(
        TYPE,
        { frequency: '5m' },
        { id: ID, overwrite: true }
      );
      // A new frequency against kibana.yml's 1m.
      expect(services.taskManager?.runSoon).toHaveBeenCalledTimes(2);
    });

    it('leaves the task to read a new concurrency at its next run', async () => {
      const { result, services } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        saved: { frequency: '5m' },
        params: { body: { frequency: '5m', concurrency: 4 } },
      });

      await result;

      expect(services.taskManager?.runSoon).not.toHaveBeenCalled();
    });

    it('goes back to the kibana.yml settings for the ones left out', async () => {
      const { result, client } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        saved: { frequency: '5m', concurrency: 4 },
        params: { body: { concurrency: 4 } },
      });

      expect(await result).toEqual({
        settings: { frequency: '1m', concurrency: 4 },
        defaults: DEFAULTS,
      });
      expect(client.create).toHaveBeenCalledWith(
        TYPE,
        { concurrency: 4 },
        { id: ID, overwrite: true }
      );
    });

    it('goes back to every kibana.yml setting for an empty body, which arrives as none', async () => {
      // The route repository drops an empty body from the params.
      const { result, client } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        saved: { frequency: '5m', concurrency: 4 },
        params: {},
      });

      expect(await result).toEqual({ settings: DEFAULTS, defaults: DEFAULTS });
      expect(client.create).toHaveBeenCalledWith(TYPE, {}, { id: ID, overwrite: true });
    });

    it('saves the settings when the task cannot run right away, or sessions are not set up', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.runSoon.mockRejectedValue(new Error('task is already running'));
      const { result, logger } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        params: { body: { frequency: '30s' } },
        services: {
          taskManager,
          canEncrypt: true,
          authz: undefined,
        },
      });

      expect(await result).toEqual({
        settings: { frequency: '30s', concurrency: 2 },
        defaults: DEFAULTS,
      });
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('task is already running'));
    });

    it('saves the settings without Task Manager', async () => {
      const { result } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        params: { body: { frequency: '30s' } },
        services: {
          taskManager: undefined,
          canEncrypt: true,
          authz: undefined,
        },
      });

      await expect(result).resolves.toEqual(
        expect.objectContaining({ settings: { frequency: '30s', concurrency: 2 } })
      );
    });

    it('refuses a user who cannot manage sessions in every space, as the settings serve all', async () => {
      jest.mocked(canManageSessionsInAllSpaces).mockResolvedValue(false);
      const { result, client, services, request } = runHandler(SESSIONS_SETTINGS_UPDATE_ENDPOINT, {
        params: { body: { frequency: '5m' } },
      });

      await expect(result).rejects.toMatchObject({
        output: { statusCode: 403 },
        message: expect.stringContaining('in all spaces'),
      });
      expect(canManageSessionsInAllSpaces).toHaveBeenCalledWith(services.authz, request);
      expect(client.create).not.toHaveBeenCalled();
      expect(services.taskManager?.runSoon).not.toHaveBeenCalled();
    });

    it('audits a failed change and answers its error', async () => {
      const forbidden = SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Unauthorized'));
      const { result, client, coreContext, services } = runHandler(
        SESSIONS_SETTINGS_UPDATE_ENDPOINT,
        { params: { body: { frequency: '5m' } } }
      );
      client.create.mockRejectedValue(forbidden);

      await expect(result).rejects.toBe(forbidden);
      expect(coreContext.security.audit.logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Failed attempt by user [ana] to change the Digital Experience session summaries settings',
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
      expect(services.taskManager?.runSoon).not.toHaveBeenCalled();
    });

    it.each([
      undefined,
      {},
      { frequency: '30s' },
      { frequency: '1h', concurrency: 4 },
      { concurrency: 1 },
    ])('accepts %j', (body) => {
      expect(bodySchemaOf().safeParse(body).success).toBe(true);
    });

    it.each([
      { frequency: '2h' },
      { frequency: '0m' },
      { frequency: 'fast' },
      { frequency: '1'.repeat(9) + 's' },
      { concurrency: 0 },
      { concurrency: 5 },
      { concurrency: 2.5 },
      { concurrency: '4' },
    ])('rejects %j', (body) => {
      expect(bodySchemaOf().safeParse(body).success).toBe(false);
    });
  });
});
