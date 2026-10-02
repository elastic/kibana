/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE } from './saved_object';
import { REQUEST, makeManagementApi, makeService } from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('getState', () => {
    it('returns enabled when no state has been persisted', async () => {
      const { service } = makeService();
      await expect(service.getState({ request: REQUEST })).resolves.toBe('enabled');
    });

    it('returns the persisted state without reading feature settings', async () => {
      const { api } = makeManagementApi();
      const { service, spaceUiSettingsClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      spaceUiSettingsClient.get.mockClear();

      await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
      expect(spaceUiSettingsClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('reports the enabled state when no state has been persisted', async () => {
      const { service } = makeService();
      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual({
        state: 'enabled',
        featureSettings: {
          continuousOnboardingEnabled: false,
          scheduledDiscoveryEnabled: false,
        },
      });
    });

    it('reads state through the internal repository, not a scoped client', async () => {
      const { service, savedObjects } = makeService();
      await service.getStatus({ request: REQUEST });
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      ]);
      expect(savedObjects.getScopedClient).not.toHaveBeenCalled();
    });
  });

  describe('persist write failures', () => {
    it('fails before the sweep when pause intent cannot be persisted', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      soClient.create.mockRejectedValueOnce(new Error('so write failed on pause intent'));

      await expect(service.pause({ request: REQUEST })).rejects.toThrow(
        'so write failed on pause intent'
      );
      expect(updateWorkflow).not.toHaveBeenCalled();
      await expect(service.getState({ request: REQUEST })).resolves.toBe('enabled');
    });

    it('returns a paused summary with snapshot failure when the post-sweep write fails', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      // Intent write succeeds; snapshot write (second create) fails.
      const store = new Map<string, Record<string, unknown>>();
      soClient.get.mockImplementation(async (type: string, id: string) => {
        const attributes = store.get(`${type}:${id}`);
        if (!attributes) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        return { id, type, references: [], attributes };
      });
      soClient.create.mockImplementation(
        async (type: string, attributes: Record<string, unknown>, options: { id: string }) => {
          const key = `${type}:${options.id}`;
          if (store.has(key)) {
            throw new Error('so write failed on pause snapshot');
          }
          store.set(key, attributes);
          return { id: options.id, type, references: [], attributes };
        }
      );

      // Intent already blocks activity — surface partial success instead of a hard failure.
      const summary = await service.pause({ request: REQUEST });
      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'pause',
            error: expect.stringContaining('so write failed on pause snapshot'),
          }),
        ])
      );
      expect(updateWorkflow).toHaveBeenCalled();
      await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
    });
  });
});
