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
import { DefaultRuleService } from '../default_alerts/default_alert_service';
import type { RouteContext } from '../types';

const buildRouteContext = (overrides: Partial<RouteContext> = {}): RouteContext =>
  ({
    savedObjectsClient: savedObjectsClientMock.create(),
    server: { pluginsStart: { taskManager: taskManagerMock.createStart() } },
    request: { body: {} },
    response: {},
    ...overrides,
  } as unknown as RouteContext);

describe('dynamic settings routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createGetDynamicSettingsRoute', () => {
    it('returns the saved settings without a sync interval and does not read the sync task', async () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      const context = buildRouteContext();

      const result = await createGetDynamicSettingsRoute().handler(context);

      expect(result).toEqual({
        certAgeThreshold: DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES.certAgeThreshold,
        certExpirationThreshold: DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES.certExpirationThreshold,
        defaultConnectors: DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES.defaultConnectors,
        defaultEmail: DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES.defaultEmail,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      expect(context.server.pluginsStart.taskManager.get).not.toHaveBeenCalled();
    });
  });

  describe('createPostDynamicSettingsRoute', () => {
    const mockSettingsStore = () => {
      jest
        .spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings')
        .mockResolvedValue(DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES);
      return jest
        .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
        .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
    };

    it('merges the request body over the previous settings', async () => {
      const setSpy = mockSettingsStore();

      const result = await createPostDynamicSettingsRoute().handler(
        buildRouteContext({ request: { body: { certAgeThreshold: 100 } } as never })
      );

      expect(setSpy.mock.calls[0][1]).toEqual({
        ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
        certAgeThreshold: 100,
      });
      expect(result).toMatchObject({ certAgeThreshold: 100 });
    });

    describe('default rule actions', () => {
      const setUp = (body: Record<string, unknown>) => {
        jest.spyOn(syntheticsSettingsModule, 'getSyntheticsDynamicSettings').mockResolvedValue({
          ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES,
          defaultConnectors: ['old'],
        });
        jest
          .spyOn(syntheticsSettingsModule, 'setSyntheticsDynamicSettings')
          .mockImplementation(async (_client, settings: DynamicSettingsAttributes) => settings);
        return buildRouteContext({ request: { body } as never, context: {} as never });
      };

      it('refreshes default rule actions with the stored previous connectors when connectors change', async () => {
        const refresh = jest
          .spyOn(DefaultRuleService.prototype, 'refreshDefaultRuleActions')
          .mockResolvedValue();

        await createPostDynamicSettingsRoute().handler(setUp({ defaultConnectors: ['new'] }));

        expect(refresh).toHaveBeenCalledWith(
          expect.objectContaining({ defaultConnectors: ['new'] }),
          ['old']
        );
      });

      it('does not refresh default rules when connectors and email are unchanged', async () => {
        const refresh = jest
          .spyOn(DefaultRuleService.prototype, 'refreshDefaultRuleActions')
          .mockResolvedValue();

        await createPostDynamicSettingsRoute().handler(setUp({ certAgeThreshold: 100 }));

        expect(refresh).not.toHaveBeenCalled();
      });

      it('does not persist settings when refreshing rules fails so the save can be retried', async () => {
        jest
          .spyOn(DefaultRuleService.prototype, 'refreshDefaultRuleActions')
          .mockRejectedValue(new Error('forbidden'));
        const routeContext = setUp({ defaultConnectors: ['new'] });

        await expect(createPostDynamicSettingsRoute().handler(routeContext)).rejects.toThrow(
          'forbidden'
        );
        expect(syntheticsSettingsModule.setSyntheticsDynamicSettings).not.toHaveBeenCalled();
      });
    });

    it('ignores privateLocationsSyncInterval from older clients', async () => {
      const setSpy = mockSettingsStore();
      const context = buildRouteContext({
        request: { body: { certAgeThreshold: 100, privateLocationsSyncInterval: 10 } } as never,
      });

      const result = await createPostDynamicSettingsRoute().handler(context);

      const { taskManager } = context.server.pluginsStart;
      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
      expect(taskManager.runSoon).not.toHaveBeenCalled();
      expect(setSpy.mock.calls[0][1]).not.toHaveProperty('privateLocationsSyncInterval');
      expect(result).not.toHaveProperty('privateLocationsSyncInterval');
    });
  });

  describe('DynamicSettingsSchema', () => {
    it('still accepts a payload that carries the removed sync interval', () => {
      expect(() =>
        DynamicSettingsSchema.validate({ certAgeThreshold: 100, privateLocationsSyncInterval: 10 })
      ).not.toThrow();
    });

    it('rejects an out-of-range sync interval instead of passing it through', () => {
      expect(() =>
        DynamicSettingsSchema.validate({ privateLocationsSyncInterval: 5000 })
      ).toThrow();
    });

    it('rejects non-integer thresholds', () => {
      expect(() => DynamicSettingsSchema.validate({ certAgeThreshold: 1.5 })).toThrow(
        'Value must be an integer.'
      );
    });

    it('rejects unknown keys', () => {
      expect(() => DynamicSettingsSchema.validate({ somethingElse: true })).toThrow();
    });
  });
});
