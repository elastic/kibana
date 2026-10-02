/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '../../../common/maintenance/actors';
import {
  REQUEST,
  SYSTEM_REQUEST,
  makeManagementApi,
  makeService,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('pauseOnFlagOff', () => {
    it('pauses every space through internal clients, records the restore snapshot, and leaves rules running', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const {
        service,
        soClient,
        getScopedClients,
        v2RulesClient,
        getInternalSpaceUiSettingsClient,
      } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        spaceIds: ['default'],
        internalSpaceIds: ['default', 'space-a'],
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
      });
      // No user behind a flag flip: anything user-scoped fails.
      getScopedClients.mockRejectedValue(new Error('missing authentication credentials'));

      await service.pauseOnFlagOff();

      expect(updateWorkflow).toHaveBeenCalledWith(
        `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
        { enabled: false },
        'space-a',
        SYSTEM_REQUEST
      );
      expect(getInternalSpaceUiSettingsClient('space-a').set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        false
      );
      expect(v2RulesClient?.bulkDisableRules).not.toHaveBeenCalled();
      expect(soClient.create.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({
          state: 'paused',
          updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
          disabledRuleIds: [],
          pausedSettings: {
            continuousOnboardingWasEnabled: true,
            scheduledDiscoveryEnabledSpaceIds: ['default', 'space-a'],
          },
          lastSummary: expect.objectContaining({ partialFailures: [] }),
        })
      );
    });

    it('does not sweep when already paused or when another node claims the pause first', async () => {
      // Every sweep cancels in-flight executions, so no cancel call means no sweep.
      const { api, cancelAllActiveWorkflowExecutions: sweepSignal } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      // Another node created the state document between our read and our claim.
      soClient.create.mockImplementationOnce(async (type: string, _attrs, options) => {
        throw SavedObjectsErrorHelpers.createConflictError(type, options.id);
      });
      await service.pauseOnFlagOff();
      expect(sweepSignal).not.toHaveBeenCalled();

      // Another node updated the (enabled) state document between our read and our claim.
      await service.pause({ request: REQUEST });
      await service.resume({ request: REQUEST });
      sweepSignal.mockClear();
      soClient.update.mockImplementationOnce(async (type: string, id: string) => {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      });
      await service.pauseOnFlagOff();
      expect(sweepSignal).not.toHaveBeenCalled();

      // Already paused (by a user or an earlier flip).
      await service.pause({ request: REQUEST });
      sweepSignal.mockClear();
      await service.pauseOnFlagOff();

      expect(sweepSignal).not.toHaveBeenCalled();
    });
  });

  describe('reassertPause', () => {
    it('is a no-op when not paused', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api });

      await service.reassertPause();

      expect(updateWorkflow).not.toHaveBeenCalled();
    });

    it('re-disables workflows after a flag-flip style re-enable while paused', async () => {
      const { api, updateWorkflow, getWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      // Simulate install re-enabling a workflow while pause is still in effect.
      getWorkflow.mockImplementation(async (id: string, spaceId: string) => ({
        id,
        enabled: true,
        definition: { id },
      }));

      await service.reassertPause();

      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: false },
        expect.any(String),
        SYSTEM_REQUEST
      );
      const status = await service.getStatus({ request: REQUEST });
      expect(status.state).toBe('paused');
      expect(status.updatedAt).toBeDefined();
    });

    it('re-asserts across every space with a credential-less request', async () => {
      const { api, updateWorkflow, getWorkflow } = makeManagementApi();
      const {
        service,
        soClient,
        getScopedClients,
        globalUiSettingsClient,
        getInternalSpaceUiSettingsClient,
      } = makeService({
        management: api,
        spaceIds: ['default'],
        internalSpaceIds: ['default', 'space-a'],
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();
      globalUiSettingsClient.set.mockClear();

      // The system request has no credentials, so anything user-scoped fails.
      getScopedClients.mockRejectedValue(new Error('missing authentication credentials'));
      getWorkflow.mockImplementation(async (id: string) => ({
        id,
        enabled: true,
        definition: { id },
      }));

      await service.reassertPause();

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        lastSummary?: { partialFailures: unknown[] };
      };
      expect(lastWrite.lastSummary?.partialFailures).toEqual([]);
      expect(updateWorkflow).toHaveBeenCalledWith(
        `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
        { enabled: false },
        'space-a',
        SYSTEM_REQUEST
      );
      expect(globalUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        false
      );
      expect(getInternalSpaceUiSettingsClient('space-a').set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        false
      );
    });

    it('persists sweep failures on lastSummary so status shows a degraded pause', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });

      // Simulate install leaving workflows enabled while management is unhealthy.
      api.getWorkflow.mockRejectedValue(new Error('workflows down'));

      await service.reassertPause();

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        lastSummary?: { partialFailures: Array<{ target: string; error: string }> };
        updatedAt?: string;
      };
      expect(lastWrite?.lastSummary?.partialFailures.length).toBeGreaterThan(0);
      expect(lastWrite?.lastSummary?.partialFailures[0].error).toContain('workflows down');
      expect(lastWrite?.updatedAt).toBeDefined();
    });

    it('propagates a persist failure during reassert instead of masking it with a second write', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const writesAfterPause = soClient.create.mock.calls.length;

      // The single reassert write fails. A persistence failure is inherently
      // unpersistable, so it surfaces to the caller (the plugin hook logs it)
      // rather than triggering a second "we failed to persist" write.
      soClient.create.mockRejectedValueOnce(new Error('so write failed'));

      await expect(service.reassertPause()).rejects.toThrow('so write failed');
      expect(soClient.create.mock.calls.length).toBe(writesAfterPause + 1);
    });
  });
});
