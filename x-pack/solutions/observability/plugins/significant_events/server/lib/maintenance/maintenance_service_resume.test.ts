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
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  REQUEST,
  cleanupDocumentId,
  continuousDocumentId,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('resume', () => {
    it('leaves the rules of a source disabled before or during the pause off', async () => {
      const { api } = makeManagementApi();
      const { service, v2RulesClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        disabledSourceRuleIds: ['rule-2'],
      });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1'] });
      expect(summary.rulesDisabled).toBe(0);
    });

    it('re-enables exactly the workflows and rules that pause disabled', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient, spaceUiSettingsClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();
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
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
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
      // Continuous onboarding is off, so its space document is not installed.
      const { api, updateWorkflow } = makeManagementApi({
        missingWorkflows: [continuousDocumentId('default')],
      });
      const { service, spaceUiSettingsClient, soClient } = makeService({
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
        pauseWrite.disabledWorkflows.some((workflow) =>
          workflow.id.startsWith(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID)
        )
      ).toBe(false);

      updateWorkflow.mockClear();
      spaceUiSettingsClient.set.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(spaceUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        true
      );
      expect(spaceUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        true
      );
      const reEnabledIds = updateWorkflow.mock.calls
        .filter((call) => call[1]?.enabled === true)
        .map((call) => call[0] as string);
      expect(
        reEnabledIds.some((id) => id.startsWith(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID))
      ).toBe(false);
      // Non-settings-backed workflows still come back.
      expect(reEnabledIds).toContain(cleanupDocumentId('default'));

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          featureSettings: {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          },
        })
      );
    });

    it('does not restore continuous onboarding when its document was enabled by drift', async () => {
      // The document is enabled by drift (e.g. the toggle ON route enabled it but
      // its setting write failed) while the setting reads false. Pause disables the
      // document; Resume must not write the setting to true.
      const { api, updateWorkflow } = makeManagementApi();
      const { service, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: false,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      spaceUiSettingsClient.set.mockClear();
      updateWorkflow.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(spaceUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        true
      );
      const reEnabledIds = updateWorkflow.mock.calls
        .filter((call) => call[1]?.enabled === true)
        .map((call) => call[0] as string);
      expect(
        reEnabledIds.some((id) =>
          id.startsWith(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID)
        )
      ).toBe(false);
    });

    it('restores continuous onboarding when pause could not disable its document', async () => {
      const { api } = makeManagementApi({ failUpdateFor: continuousDocumentId('default') });
      const { service, soClient, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
      });

      await service.pause({ request: REQUEST });

      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(pauseWrite.disabledWorkflows).toContainEqual({
        id: continuousDocumentId('default'),
        spaceId: 'default',
      });
      spaceUiSettingsClient.set.mockClear();

      await service.resume({ request: REQUEST });

      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        true
      );
    });

    it('restores continuous onboarding when its setting was on but its document was already off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
      });
      await api.updateWorkflow(continuousDocumentId('default'), { enabled: false }, 'default');

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();
      spaceUiSettingsClient.set.mockClear();

      await service.resume({ request: REQUEST });

      expect(updateWorkflow).toHaveBeenCalledWith(
        continuousDocumentId('default'),
        { enabled: true },
        'default',
        REQUEST
      );
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        true
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
      const { api } = makeManagementApi({ failEnableFor: cleanupDocumentId('default') });
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures.length).toBeGreaterThan(0);
      expect(summary.workflowsDisabled).toBe(1);
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string }>;
        disabledRules: string[];
      };
      expect(lastWrite.state).toBe('enabled');
      expect(lastWrite.disabledRules).toEqual([]);
      expect(lastWrite.disabledWorkflows).toEqual([
        expect.objectContaining({ id: cleanupDocumentId('default') }),
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
        expect.objectContaining({
          state: 'enabled',
          disabledRules: [{ id: 'rule-1', spaceId: 'default' }],
        })
      );
    });

    it('reports partialFailures and keeps failed inventory when resume has warnings', async () => {
      const { api } = makeManagementApi({ failEnableFor: cleanupDocumentId('default') });
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
      const failEnableFor = { id: cleanupDocumentId('default') as string | undefined };
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
          (call) => call[0] === cleanupDocumentId('default') && call[1]?.enabled === true
        )
      ).toBe(true);
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: unknown[];
        disabledRules: unknown[];
      };
      expect(lastWrite.disabledWorkflows).toEqual([]);
      expect(lastWrite.disabledRules).toEqual([]);
    });

    it('flips to enabled with warnings when settings restore fails (no workflow rollback)', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      spaceUiSettingsClient.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED) {
          throw new Error('set failed for continuous');
        }
      });

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'settings:continuous-onboarding@default',
            error: expect.stringContaining('Failed to resume'),
          }),
        ])
      );

      const continuousEnableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === continuousDocumentId('default') && call[1]?.enabled === true
      );
      const continuousDisableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === continuousDocumentId('default') && call[1]?.enabled === false
      );
      expect(continuousEnableCalls.length).toBeGreaterThan(0);
      // No compensating disable after settings failure.
      expect(continuousDisableCalls.length).toBe(0);

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
        pausedSettings?: unknown;
      };
      expect(lastWrite.state).toBe('enabled');
      // The continuous document stays recorded so a later Resume (e.g. by someone
      // who can write the setting) restores the setting.
      expect(lastWrite.pausedSettings).toBeUndefined();
      expect(lastWrite.disabledWorkflows).toEqual([
        { id: continuousDocumentId('default'), spaceId: 'default' },
      ]);

      spaceUiSettingsClient.set.mockClear();
      spaceUiSettingsClient.set.mockImplementation(async () => {});
      await service.resume({ request: REQUEST });

      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        true
      );
      expect(soClient.create.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({ state: 'enabled', disabledWorkflows: [] })
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
