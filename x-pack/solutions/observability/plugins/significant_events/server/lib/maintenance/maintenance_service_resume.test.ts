/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  REQUEST,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('resume', () => {
    it('re-enables exactly the workflows and rules that pause disabled', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient, globalUiSettingsClient, spaceUiSettingsClient } = makeService(
        {
          management: api,
          ruleBackedRuleIds: ['rule-1', 'rule-2'],
          continuousOnboardingEnabled: true,
          scheduledDiscoveryEnabled: true,
        }
      );

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();
      globalUiSettingsClient.set.mockClear();
      spaceUiSettingsClient.set.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
      expect(globalUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        true
      );
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        true
      );

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          state: 'enabled',
          featureSettings: {
            continuousOnboardingEnabled: true,
            scheduledDiscoveryEnabled: true,
          },
        })
      );
    });

    it('does not re-enable settings-backed workflows that were off before pause', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, globalUiSettingsClient, spaceUiSettingsClient, soClient } = makeService({
        management: api,
        // Continuous + scheduled settings were already off — only workflows may be
        // enabled (drift). Resume must leave both settings and those workflows off.
        continuousOnboardingEnabled: false,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        pausedSettings?: {
          continuousOnboardingWasEnabled: boolean;
          scheduledDiscoveryEnabledSpaceIds: string[];
        };
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(pauseWrite.pausedSettings).toEqual({
        continuousOnboardingWasEnabled: false,
        scheduledDiscoveryEnabledSpaceIds: [],
      });
      expect(
        pauseWrite.disabledWorkflows.some(
          (workflow) => workflow.id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
        )
      ).toBe(true);

      updateWorkflow.mockClear();
      globalUiSettingsClient.set.mockClear();
      spaceUiSettingsClient.set.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(globalUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        true
      );
      expect(spaceUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        true
      );
      const reEnabledIds = updateWorkflow.mock.calls
        .filter((call) => call[1]?.enabled === true)
        .map((call) => call[0] as string);
      expect(reEnabledIds).not.toContain(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID);
      expect(
        reEnabledIds.some((id) => id.startsWith(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID))
      ).toBe(false);
      // Non-settings-backed workflows still come back.
      expect(reEnabledIds).toContain(SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID);

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          featureSettings: {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          },
        })
      );
    });

    it('is a no-op when not paused', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient } = makeService({ management: api });

      const summary = await service.resume({ request: REQUEST });

      expect(summary).toEqual({
        state: 'enabled',
        executionsCancelled: 0,
        workflowsDisabled: 0,
        rulesDisabled: 0,
        partialFailures: [],
      });
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(v2RulesClient?.bulkEnableRules).not.toHaveBeenCalled();
    });

    it('flips to enabled with warnings when a workflow cannot be re-enabled', async () => {
      const { api } = makeManagementApi({
        failEnableFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures.length).toBeGreaterThan(0);
      expect(summary.workflowsDisabled).toBe(1);
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string }>;
        disabledRuleIds: string[];
      };
      expect(lastWrite.state).toBe('enabled');
      expect(lastWrite.disabledRuleIds).toEqual([]);
      expect(lastWrite.disabledWorkflows).toEqual([
        expect.objectContaining({ id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID }),
      ]);
      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({ state: 'enabled' })
      );
    });

    it('flips to enabled with warnings when a rule cannot be re-enabled', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        enableErrors: [
          {
            id: 'rule-1',
            error: { code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'boom' },
          },
        ],
      });
      const { service, soClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        v2RulesClient,
      });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures).toContainEqual({ target: 'rule:rule-1', error: 'boom' });
      expect(summary.rulesDisabled).toBe(1);
      const lastWrite = soClient.create.mock.calls.at(-1);
      expect(lastWrite?.[1]).toEqual(
        expect.objectContaining({ state: 'enabled', disabledRuleIds: ['rule-1'] })
      );
    });

    it('reports partialFailures and keeps failed inventory when resume has warnings', async () => {
      const { api } = makeManagementApi({
        failEnableFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
      });

      const pauseSummary = await service.pause({ request: REQUEST });
      expect(pauseSummary.workflowsDisabled).toBeGreaterThan(0);
      expect(pauseSummary.rulesDisabled).toBe(1);

      const resumeSummary = await service.resume({ request: REQUEST });

      expect(resumeSummary.state).toBe('enabled');
      expect(resumeSummary.workflowsDisabled).toBe(1);
      expect(resumeSummary.rulesDisabled).toBe(0);
      expect(resumeSummary.partialFailures.length).toBeGreaterThan(0);
    });

    it('retries leftover inventory on a second resume while already enabled', async () => {
      const failEnableFor = {
        id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID as string | undefined,
      };
      const { api, updateWorkflow } = makeManagementApi({ failEnableFor });
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const firstResume = await service.resume({ request: REQUEST });
      expect(firstResume.state).toBe('enabled');
      expect(firstResume.workflowsDisabled).toBe(1);

      failEnableFor.id = undefined;
      updateWorkflow.mockClear();
      const secondResume = await service.resume({ request: REQUEST });

      expect(secondResume.state).toBe('enabled');
      expect(secondResume.workflowsDisabled).toBe(0);
      expect(secondResume.partialFailures).toEqual([]);
      expect(
        updateWorkflow.mock.calls.some(
          (call) =>
            call[0] === SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID && call[1]?.enabled === true
        )
      ).toBe(true);
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: unknown[];
        disabledRuleIds: unknown[];
      };
      expect(lastWrite.disabledWorkflows).toEqual([]);
      expect(lastWrite.disabledRuleIds).toEqual([]);
    });

    it('flips to enabled with warnings when settings restore fails (no workflow rollback)', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, globalUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      globalUiSettingsClient.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED) {
          throw new Error('set failed for continuous');
        }
      });

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'settings:continuous-onboarding',
            error: expect.stringContaining('Failed to resume'),
          }),
        ])
      );

      const continuousEnableCalls = updateWorkflow.mock.calls.filter(
        (call) =>
          call[0] === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID &&
          call[1]?.enabled === true
      );
      const continuousDisableCalls = updateWorkflow.mock.calls.filter(
        (call) =>
          call[0] === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID &&
          call[1]?.enabled === false
      );
      expect(continuousEnableCalls.length).toBeGreaterThan(0);
      // No compensating disable after settings failure.
      expect(continuousDisableCalls.length).toBe(0);

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string }>;
        pausedSettings?: { continuousOnboardingWasEnabled: boolean };
      };
      expect(lastWrite.state).toBe('enabled');
      // Kept so a later Resume (e.g. by someone who can write the setting) restores it.
      expect(lastWrite.pausedSettings).toEqual({
        continuousOnboardingWasEnabled: true,
        scheduledDiscoveryEnabledSpaceIds: [],
      });
      expect(lastWrite.disabledWorkflows).toEqual([]);

      globalUiSettingsClient.set.mockClear();
      globalUiSettingsClient.set.mockImplementation(async () => {});
      await service.resume({ request: REQUEST });

      expect(globalUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        true
      );
      expect(soClient.create.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({ state: 'enabled', pausedSettings: undefined })
      );
    });

    it('flips to enabled with warnings when scheduled-discovery restore fails', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: false,
        scheduledDiscoveryEnabled: true,
        spaceIds: ['default', 'space-a'],
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      spaceUiSettingsClient.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED) {
          throw new Error('set failed for scheduled');
        }
      });

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: expect.stringContaining('settings:scheduled-discovery@'),
            error: expect.stringContaining('Failed to resume'),
          }),
        ])
      );

      const scheduledDocId = `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-default`;
      const scheduledEnableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === scheduledDocId && call[1]?.enabled === true
      );
      const scheduledDisableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === scheduledDocId && call[1]?.enabled === false
      );
      expect(scheduledEnableCalls.length).toBeGreaterThan(0);
      expect(scheduledDisableCalls.length).toBe(0);

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(lastWrite.state).toBe('enabled');
      expect(lastWrite.disabledWorkflows).toEqual([]);
    });

    it('does not roll runtime back when resume persist fails after re-enabling', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        continuousOnboardingEnabled: true,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      soClient.create.mockRejectedValueOnce(new Error('so write failed on resume'));

      await expect(service.resume({ request: REQUEST })).rejects.toThrow(
        'so write failed on resume'
      );

      // Best-effort re-enable happened; no compensating disable after the failed write.
      const disableAfterResume = updateWorkflow.mock.calls.filter(
        (call) => call[1]?.enabled === false
      );
      expect(disableAfterResume.length).toBe(0);
      // SO write failed, so the persisted state is still paused.
      await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
    });
  });
});
