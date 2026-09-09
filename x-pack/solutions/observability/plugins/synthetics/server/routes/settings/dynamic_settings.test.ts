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
    it('defaults rebalancePrivateLocationShardsEnabled to true when unset on the saved object', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);

      const route = createGetDynamicSettingsRoute();
      const result = await route.handler(buildRouteContext());

      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: true });
    });

    it('returns the persisted value when explicitly disabled', async () => {
      jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        rebalancePrivateLocationShardsEnabled: false,
      });

      const route = createGetDynamicSettingsRoute();
      const result = await route.handler(buildRouteContext());

      expect(result).toMatchObject({ rebalancePrivateLocationShardsEnabled: false });
    });
  });

  describe('createPostDynamicSettingsRoute', () => {
    it('persists rebalancePrivateLocationShardsEnabled via setSyntheticsDynamicSettings', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      const setSpy = jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);

      const route = createPostDynamicSettingsRoute();
      const result = await route.handler(
        buildRouteContext({
          request: { body: { rebalancePrivateLocationShardsEnabled: false } } as never,
        })
      );

      expect(setSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rebalancePrivateLocationShardsEnabled: false })
      );
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
