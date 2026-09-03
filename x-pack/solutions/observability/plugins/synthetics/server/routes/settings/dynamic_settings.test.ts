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

const buildServer = () =>
  ({
    logger: loggerMock.create(),
    pluginsStart: { taskManager: taskManagerMock.createStart() },
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
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false },
      });

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
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
      });
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

  describe('DynamicSettingsSchema', () => {
    it('accepts a boolean rebalancePrivateLocationShardsEnabled', () => {
      expect(
        DynamicSettingsSchema.validate({ rebalancePrivateLocationShardsEnabled: false })
      ).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
    });

    it('rejects a non-boolean rebalancePrivateLocationShardsEnabled', () => {
      expect(() =>
        DynamicSettingsSchema.validate({ rebalancePrivateLocationShardsEnabled: 'nope' })
      ).toThrow();
    });
  });
});
