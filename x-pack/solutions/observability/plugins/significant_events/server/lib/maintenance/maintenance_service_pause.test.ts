/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_MAINTENANCE_WORKFLOW_IDS } from './managed_workflow_targets';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';
import {
  REQUEST,
  cleanupDocumentId,
  continuousDocumentId,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('pause', () => {
    it('disables workflows and v2-backed rules, cancels executions, and persists the paused state', async () => {
      const { api, updateWorkflow, cancelAllActiveWorkflowExecutions } = makeManagementApi();
      const { service, soClient, v2RulesClient, spaceUiSettingsClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2', 'rule-1'],
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
      });

      const summary = await service.pause({ request: REQUEST, updatedBy: 'marco' });

      expect(summary.state).toBe('paused');
      expect(summary.workflowsDisabled).toBeGreaterThan(0);
      expect(summary.rulesDisabled).toBe(2);
      expect(summary.executionsCancelled).toBe(0);
      expect(summary.partialFailures).toEqual([]);

      // every disable is an enablement-only update
      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: false },
        expect.any(String),
        REQUEST
      );
      // deduped rule ids, disabled in bulk on the v2 engine
      expect(v2RulesClient?.bulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
      // The shared workflows belong to every space: their executions in this space are
      // cancelled, but the workflow documents themselves are left enabled.
      expect(cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
        'default',
        REQUEST
      );
      const disabledIds = updateWorkflow.mock.calls.map(([id]) => id);
      for (const sharedId of GLOBAL_MAINTENANCE_WORKFLOW_IDS) {
        expect(disabledIds).not.toContain(sharedId);
      }
      expect(updateWorkflow.mock.calls.every(([, , spaceId]) => spaceId === 'default')).toBe(true);

      // Settings toggles turned off; prior-enabled flags stored for resume.
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        false
      );
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        false
      );

      // persisted with attribution
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({
          state: 'paused',
          updatedBy: 'marco',
          pausedSettings: {
            continuousOnboardingWasEnabled: false,
            scheduledDiscoveryEnabledSpaceIds: ['default'],
          },
        }),
        { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
      );

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          state: 'paused',
          updatedBy: 'marco',
          featureSettings: {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          },
        })
      );
    });

    it('re-pauses while already paused: retries a workflow that failed the first time', async () => {
      const enabled = new Map<string, boolean>();
      const stateKey = (id: string, spaceId: string) => `${id}@${spaceId}`;
      let failCleanup = true;

      const getWorkflow = jest.fn(async (id: string, spaceId: string) => ({
        id,
        enabled: enabled.get(stateKey(id, spaceId)) ?? true,
        definition: { id },
      }));
      const updateWorkflow = jest.fn(
        async (id: string, patch: { enabled?: boolean }, spaceId: string) => {
          if (failCleanup && id === cleanupDocumentId('default')) {
            throw new Error('update failed for cleanup');
          }
          enabled.set(stateKey(id, spaceId), patch.enabled ?? true);
          return {
            id,
            enabled: patch.enabled,
            validationErrors: [] as string[],
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: 'system',
            valid: true,
          };
        }
      );
      const api = {
        getClient: jest.fn(() => ({ getWorkflow })),
        getWorkflow,
        updateWorkflow,
        cancelAllActiveWorkflowExecutions: jest.fn(),
      };
      const { service } = makeService({ management: api });

      const first = await service.pause({ request: REQUEST });
      expect(first.partialFailures.some((f) => f.target.includes('cleanup'))).toBe(true);

      failCleanup = false;
      const second = await service.pause({ request: REQUEST });

      expect(second.partialFailures).toEqual([]);
      expect(second.workflowsDisabled).toBeGreaterThan(0);
      const status = await service.getStatus({ request: REQUEST });
      expect(status.state).toBe('paused');
      expect(
        status.lastSummary?.partialFailures.some((f) => f.target.includes('cleanup'))
      ).toBeFalsy();
    });

    it('is a no-op for already-disabled workflows on a clean re-pause but keeps snapshot counts', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api, ruleBackedRuleIds: ['rule-1'] });

      const first = await service.pause({ request: REQUEST });
      const callsAfterFirst = updateWorkflow.mock.calls.length;

      const second = await service.pause({ request: REQUEST });

      expect(second.state).toBe('paused');
      // Sweep deltas are zero, but lastSummary keeps snapshot sizes for the UI.
      expect(second.workflowsDisabled).toBe(first.workflowsDisabled);
      expect(second.rulesDisabled).toBe(first.rulesDisabled);
      expect(second.workflowsDisabled).toBeGreaterThan(0);
      expect(updateWorkflow.mock.calls.length).toBe(callsAfterFirst);
    });

    it('preserves the continuous onboarding restore record across a re-pause', async () => {
      // First pause: continuous onboarding was on, gets disabled and recorded.
      // Re-pause: the setting now reads false (it was written off in the first
      // pause), but the document must stay in disabledWorkflows so Resume can
      // restore it and the setting.
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
      });

      await service.pause({ request: REQUEST });
      const firstWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(firstWrite.disabledWorkflows).toContainEqual({
        id: continuousDocumentId('default'),
        spaceId: 'default',
      });

      await service.pause({ request: REQUEST });
      const secondWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(secondWrite.disabledWorkflows).toContainEqual({
        id: continuousDocumentId('default'),
        spaceId: 'default',
      });
    });

    it('records continuous onboarding as a restore target when the setting read fails', async () => {
      // A transient error reading the setting must fall back to recording a
      // restore intent, same as the scheduled-discovery read failure path.
      const { api } = makeManagementApi();
      const { service, soClient, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
      });
      spaceUiSettingsClient.get.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED) {
          throw new Error('settings read failed');
        }
        return false;
      });

      await service.pause({ request: REQUEST });
      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(pauseWrite.disabledWorkflows).toContainEqual({
        id: continuousDocumentId('default'),
        spaceId: 'default',
      });
    });

    it('records a partial failure but still pauses when one workflow cannot be disabled', async () => {
      const { api } = makeManagementApi({ failUpdateFor: cleanupDocumentId('default') });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures.length).toBeGreaterThan(0);
      expect(summary.partialFailures[0].target).toContain(cleanupDocumentId('default'));
    });

    it('still pauses (recording a failure) when workflows management is unavailable', async () => {
      const { service } = makeService({ management: undefined });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.workflowsDisabled).toBe(0);
      expect(summary.partialFailures).toEqual([
        { target: 'workflows', error: 'Workflows management plugin is not available' },
      ]);
    });

    it('records per-rule failures and only counts the rules that were actually disabled', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        disableErrors: [
          {
            id: 'rule-2',
            error: { code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'boom' },
          },
        ],
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        v2RulesClient,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(1);
      expect(summary.partialFailures).toContainEqual({ target: 'rule:rule-2', error: 'boom' });
    });

    it('treats RULE_NOT_FOUND from a backed rule as already-gone (no failure, not counted)', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        disableErrors: [
          {
            id: 'rule-2',
            error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'not found' },
          },
        ],
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        v2RulesClient,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(1);
      expect(summary.partialFailures).toEqual([]);
    });

    it('records a failure when the alerting v2 rules client is unavailable', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        v2RulesClient: null,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(0);
      expect(summary.partialFailures).toContainEqual({
        target: 'rules',
        error: 'Alerting v2 rules client is not available',
      });
    });

    it('records a failure when cancel-all for a workflow target throws', async () => {
      const { api } = makeManagementApi({
        failCancelAllFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toContainEqual({
        spaceId: 'default',
        target: expect.stringContaining(
          `execution:${SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID}@`
        ),
        error: expect.stringContaining('cancel-all failed'),
      });
    });

    it('treats a missing workflow during cancel-all as already gone', async () => {
      const { api, cancelAllActiveWorkflowExecutions } = makeManagementApi();
      cancelAllActiveWorkflowExecutions.mockImplementation(async (workflowId: string) => {
        if (workflowId === SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID) {
          throw new WorkflowNotFoundError(workflowId);
        }
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(
        summary.partialFailures.some((failure) =>
          failure.target.includes(`execution:${SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID}@`)
        )
      ).toBe(false);
    });

    it('does not enumerate spaces, so an enumeration failure cannot affect it', async () => {
      const { api } = makeManagementApi();
      const { service, savedObjects } = makeService({
        management: api,
        spacesGetAllThrows: true,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual([]);
      expect(savedObjects.createInternalRepository).not.toHaveBeenCalled();
    });

    it('records restore flags when settings were enabled even if set(false) fails', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
        failContinuousSet: true,
        failScheduledSet: true,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'settings:continuous-onboarding@default',
            error: expect.stringContaining('Failed to pause'),
          }),
          expect.objectContaining({
            target: expect.stringContaining('settings:scheduled-discovery@'),
            error: expect.stringContaining('Failed to pause'),
          }),
        ])
      );

      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        pausedSettings?: {
          continuousOnboardingWasEnabled: boolean;
          scheduledDiscoveryEnabledSpaceIds: string[];
        };
      };
      expect(pauseWrite.pausedSettings).toEqual({
        continuousOnboardingWasEnabled: false,
        scheduledDiscoveryEnabledSpaceIds: ['default'],
      });
    });
  });
});
