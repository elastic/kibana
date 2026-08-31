/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import * as syntheticsSettingsModule from '../../saved_objects/synthetics_settings';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../../constants/settings';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import {
  createGetDynamicSettingsRoute,
  createPostDynamicSettingsRoute,
  DynamicSettingsSchema,
} from './dynamic_settings';
import type { RouteContext } from '../types';
import { REBALANCE_SHARDS_TASK_ID } from '../../tasks/rebalance_shards_enabled';

const buildServer = () =>
  ({
    pluginsStart: { taskManager: taskManagerMock.createStart() },
  } as unknown as RouteContext['server']);

const buildRouteContext = (overrides: Partial<RouteContext> = {}): RouteContext =>
  ({
    savedObjectsClient: savedObjectsClientMock.create(),
    server: buildServer(),
    request: { body: {} },
    response: {},
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
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({ enabled: false });

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
      (server.pluginsStart.taskManager.get as jest.Mock).mockResolvedValue({ enabled: false });

      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          server,
          request: { body: { rebalancePrivateLocationShardsEnabled: false } } as never,
        })
      );

      expect(server.pluginsStart.taskManager.bulkDisable).toHaveBeenCalledWith([
        REBALANCE_SHARDS_TASK_ID,
      ]);
      expect(setSpy.mock.calls[0][1].rebalancePrivateLocationShardsEnabled).toBeUndefined();
      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
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
