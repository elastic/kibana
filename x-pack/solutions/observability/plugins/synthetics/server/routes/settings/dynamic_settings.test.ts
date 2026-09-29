/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import * as syntheticsSettingsModule from '../../saved_objects/synthetics_settings';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../../constants/settings';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import {
  createGetDynamicSettingsRoute,
  createPostDynamicSettingsRoute,
  DynamicSettingsSchema,
} from './dynamic_settings';
import type { RouteContext } from '../types';
import {
  REBALANCE_SHARDS_ENABLED_STATE_KEY,
  REBALANCE_SHARDS_TASK_ID,
} from '../../tasks/rebalance_shards_enabled';

const buildSecurity = (hasAllRequested = true) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  return {
    globally,
    security: {
      authz: {
        mode: { useRbacForRequest: jest.fn().mockReturnValue(true) },
        actions: { api: { get: (operation: string) => `api:${operation}` } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
      },
    },
  };
};

const buildServer = (hasAllRequested = true) =>
  ({
    logger: loggerMock.create(),
    pluginsStart: { taskManager: taskManagerMock.createStart() },
    security: buildSecurity(hasAllRequested).security,
  } as unknown as RouteContext['server']);

const buildRouteContext = (overrides: Partial<RouteContext> = {}): RouteContext =>
  ({
    savedObjectsClient: savedObjectsClientMock.create(),
    server: buildServer(),
    request: { body: {} },
    response: {},
    syntheticsMonitorClient: {
      privateLocationAPI: { clearShardConditions: jest.fn().mockResolvedValue({ cleared: 0 }) },
    },
    ...overrides,
  } as unknown as RouteContext);

describe('dynamic settings routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createGetDynamicSettingsRoute', () => {
    it('defaults rebalancePrivateLocationShardsEnabled to true when the task is unset', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);

      const route = createGetDynamicSettingsRoute();
      const result = await route.handler(buildRouteContext());

      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: true });
    });

    it('returns false when the rebalance task is disabled', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      const server = buildServer();
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false },
      });

      const route = createGetDynamicSettingsRoute();
      const result = await route.handler(buildRouteContext({ server }));

      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
    });
  });

  describe('createPostDynamicSettingsRoute', () => {
    it('persists rebalancePrivateLocationShardsEnabled on the rebalance task, not the space settings SO', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      const setSpy = jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
      const server = buildServer();
      (server.pluginsStart.taskManager.get as jest.Mock)
        .mockResolvedValueOnce({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true } })
        .mockResolvedValue({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false } });

      const clearShardConditions = jest.fn();
      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          server,
          syntheticsMonitorClient: {
            privateLocationAPI: { clearShardConditions },
          } as never,
          request: { body: { rebalancePrivateLocationShardsEnabled: false } } as never,
        })
      );

      expect(server.pluginsStart.taskManager.bulkUpdateState).toHaveBeenCalledWith(
        [REBALANCE_SHARDS_TASK_ID],
        expect.any(Function)
      );
      expect(server.pluginsStart.taskManager.bulkDisable).not.toHaveBeenCalled();
      expect(clearShardConditions).not.toHaveBeenCalled();
      expect(server.pluginsStart.taskManager.runSoon).toHaveBeenCalledWith(
        REBALANCE_SHARDS_TASK_ID
      );
      expect(setSpy.mock.calls[0][1].rebalancePrivateLocationShardsEnabled).toBeUndefined();
      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
    });

    it('does not clear pins when turning shard rebalance on', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
      const server = buildServer();
      (server.pluginsStart.taskManager.get as jest.Mock)
        .mockResolvedValueOnce({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false } })
        .mockResolvedValue({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true } });
      const clearShardConditions = jest.fn();

      const route = createPostDynamicSettingsRoute();
      await route.handler(
        buildRouteContext({
          server,
          syntheticsMonitorClient: {
            privateLocationAPI: { clearShardConditions },
          } as never,
          request: { body: { rebalancePrivateLocationShardsEnabled: true } } as never,
        })
      );

      expect(server.pluginsStart.taskManager.bulkUpdateState).toHaveBeenCalledWith(
        [REBALANCE_SHARDS_TASK_ID],
        expect.any(Function)
      );
      expect(server.pluginsStart.taskManager.bulkEnable).not.toHaveBeenCalled();
      expect(clearShardConditions).not.toHaveBeenCalled();
      expect(server.pluginsStart.taskManager.runSoon).toHaveBeenCalledWith(
        REBALANCE_SHARDS_TASK_ID
      );
    });

    it('returns 409 when the rebalance flag does not persist on the task', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
      const server = buildServer();
      // Live task state stays on after a requested off — the write did not stick.
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
      });
      const conflict = jest.fn((opts: { body: { message: string } }) => ({
        status: 409,
        ...opts,
      }));

      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          server,
          response: { conflict } as never,
          request: { body: { rebalancePrivateLocationShardsEnabled: false } } as never,
        })
      );

      expect(conflict).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: expect.stringMatching(/could not be updated/i),
          }),
        })
      );
      expect(result).toMatchObject({ status: 409 });
    });

    it('returns 409 when the sync interval does not persist on the task', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
      const server = buildServer();
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        schedule: { interval: '5m' },
      });
      const conflict = jest.fn((opts: { body: { message: string } }) => ({
        status: 409,
        ...opts,
      }));

      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          server,
          response: { conflict } as never,
          request: { body: { privateLocationsSyncInterval: 10 } } as never,
        })
      );

      expect(conflict).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: expect.stringMatching(/sync task is currently running/i),
          }),
        })
      );
      expect(result).toMatchObject({ status: 409 });
    });
  });

  describe('cluster-wide settings privilege', () => {
    const mockSettingsSO = () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      return jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
    };
    const buildForbidden = () =>
      jest.fn((opts: { body: { message: string } }) => ({ status: 403, ...opts }));

    it.each([
      ['rebalancePrivateLocationShardsEnabled', { rebalancePrivateLocationShardsEnabled: false }],
      ['privateLocationsSyncInterval', { privateLocationsSyncInterval: 10 }],
    ])(
      'returns 403 without writes when %s changes and the user lacks the global privilege',
      async (_field, body) => {
        const setSpy = mockSettingsSO();
        const forbidden = buildForbidden();
        const server = buildServer(false);
        (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
          schedule: { interval: '5m' },
          state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
        });

        const route = createPostDynamicSettingsRoute();
        const result = await route.handler(
          buildRouteContext({
            server,
            response: { forbidden } as never,
            request: { body } as never,
          })
        );

        expect(result).toMatchObject({ status: 403 });
        expect(setSpy).not.toHaveBeenCalled();
        expect(server.pluginsStart.taskManager.bulkUpdateState).not.toHaveBeenCalled();
        expect(server.pluginsStart.taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
      }
    );

    it('allows saving space settings that echo unchanged cluster-wide values', async () => {
      const setSpy = mockSettingsSO();
      const forbidden = buildForbidden();
      const server = buildServer(false);
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        schedule: { interval: '5m' },
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
      });

      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          server,
          response: { forbidden } as never,
          request: {
            body: {
              certAgeThreshold: 100,
              privateLocationsSyncInterval: 5,
              rebalancePrivateLocationShardsEnabled: true,
            },
          } as never,
        })
      );

      expect(forbidden).not.toHaveBeenCalled();
      expect(setSpy.mock.calls[0][1].certAgeThreshold).toBe(100);
      expect(server.security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      expect(result).toMatchObject({ certAgeThreshold: 100 });
    });

    it('checks the private location write privilege globally', async () => {
      mockSettingsSO();
      const { security, globally } = buildSecurity(true);
      const server = { ...buildServer(), security } as unknown as RouteContext['server'];
      (server.pluginsStart.taskManager.get as jest.Mock)
        .mockResolvedValueOnce({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true } })
        .mockResolvedValue({ state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false } });

      const route = createPostDynamicSettingsRoute();
      await route.handler(
        buildRouteContext({
          server,
          request: { body: { rebalancePrivateLocationShardsEnabled: false } } as never,
        })
      );

      expect(globally).toHaveBeenCalledWith({ kibana: ['api:private-location-write'] });
      expect(server.pluginsStart.taskManager.bulkUpdateState).toHaveBeenCalled();
    });
  });

  describe('DynamicSettingsSchema', () => {
    it('accepts a boolean rebalancePrivateLocationShardsEnabled', () => {
      expect(
        DynamicSettingsSchema.parse({ rebalancePrivateLocationShardsEnabled: false })
      ).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
    });

    it('rejects a non-boolean rebalancePrivateLocationShardsEnabled', () => {
      expect(() =>
        DynamicSettingsSchema.parse({ rebalancePrivateLocationShardsEnabled: 'nope' })
      ).toThrow();
    });

    it('rejects unknown top-level keys so a typo cannot no-op via merge', () => {
      expect(
        DynamicSettingsSchema.safeParse({
          certAgeThresholdTypo: 90,
        }).success
      ).toBe(false);
    });

    it('rejects unknown defaultEmail keys so a typo cannot drop cc or bcc', () => {
      expect(
        DynamicSettingsSchema.safeParse({
          defaultEmail: { to: ['alerts@example.com'], ccc: ['copy@example.com'] },
        }).success
      ).toBe(false);
    });

    it('accepts a known defaultEmail payload', () => {
      expect(
        DynamicSettingsSchema.parse({
          defaultEmail: { to: ['alerts@example.com'], cc: ['copy@example.com'] },
        })
      ).toEqual({
        defaultEmail: { to: ['alerts@example.com'], cc: ['copy@example.com'] },
      });
    });
  });
});
