/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../knowledge_indicators';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { DISCOVERIES_DATA_STREAM } from '../significant_events/discoveries_data_stream';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import {
  REQUEST,
  cleanupDocumentId,
  continuousDocumentId,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('reset', () => {
    it('deletes current-space knowledge, owned rules and documents without replacing streams', async () => {
      const { api, cancelAllActiveWorkflowExecutions } = makeManagementApi();
      const {
        service,
        soClient,
        v2RulesClient,
        esClient,
        internalEsClient,
        streamDocuments,
        asScoped,
        countKnowledgeIndicators,
      } = makeService({
        management: api,
        indicatorStreams: ['logs.web'],
        ownedRuleStreams: ['logs.web', 'logs.orphan'],
        queryLinksBySource: {
          'logs.web': [{ rule_backed: true, rule_id: 'linked-rule' }, { rule_backed: false }],
        },
        knowledgeIndicatorCounts: { [KI_TYPE_FEATURE]: 2, [KI_TYPE_QUERY]: 2 },
        ownedRuleIdsBySource: {
          'logs.web': ['linked-rule', 'owned-rule'],
          'logs.orphan': ['orphan-rule'],
        },
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 3,
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: 4,
          [DISCOVERIES_DATA_STREAM]: 4,
        },
      });

      const summary = await service.reset({ request: REQUEST, updatedBy: 'marco' });

      expect(summary).toEqual(
        expect.objectContaining({
          state: 'enabled',
          executionsCancelled: 0,
          workflowsDisabled: 0,
          rulesDisabled: 0,
          deleted: {
            knowledgeIndicators: 2,
            storedQueries: 2,
            rules: 3,
            dataStreams: 3,
          },
          partialFailures: [],
        })
      );
      expect(v2RulesClient?.bulkDeleteRules).toHaveBeenCalledWith({
        ids: ['linked-rule', 'owned-rule', 'orphan-rule'],
      });
      for (const index of [
        DETECTIONS_DATA_STREAM,
        KNOWLEDGE_INDICATORS_DATA_STREAM,
        DISCOVERIES_DATA_STREAM,
      ]) {
        expect(esClient.deleteByQuery).toHaveBeenCalledWith({
          index,
          query: { term: { 'kibana.space_ids': 'default' } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
          wait_for_completion: true,
        });
      }
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(internalEsClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(internalEsClient.deleteByQuery).not.toHaveBeenCalled();
      expect(streamDocuments.get(DETECTIONS_DATA_STREAM)).toBe(0);
      expect(streamDocuments.get(KNOWLEDGE_INDICATORS_DATA_STREAM)).toBe(0);
      expect(streamDocuments.get(DISCOVERIES_DATA_STREAM)).toBe(0);
      expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(esClient.indices.refresh).toHaveBeenCalledWith({
        index: KNOWLEDGE_INDICATORS_DATA_STREAM,
      });
      expect(esClient.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
        countKnowledgeIndicators.mock.invocationCallOrder[0]
      );
      expect(asScoped).toHaveBeenCalledWith(REQUEST);
      expect(cancelAllActiveWorkflowExecutions.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.deleteByQuery.mock.invocationCallOrder[0]
      );
      expect(soClient.create.mock.calls[0][1]).toEqual(
        expect.objectContaining({ state: 'paused', updatedBy: 'marco' })
      );
      expect(soClient.create.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.deleteByQuery.mock.invocationCallOrder[0]
      );
      // The space was never paused, so the document reset created to block it is removed
      // again once there is nothing left to restore.
      expect(soClient.delete).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      );
      expect(soClient.readDocument('default')).toBeUndefined();
      await expect(service.getState({ request: REQUEST })).resolves.toBe('enabled');
    });

    it('initializes missing registered streams and reports a clean zero-count reset', async () => {
      const { api } = makeManagementApi();
      const { service, initializeClient, internalEsClient, streamDocuments } = makeService({
        management: api,
        dataStreams: {},
      });

      const summary = await service.reset({ request: REQUEST });

      expect(initializeClient.mock.calls.map(([name]) => name)).toEqual([
        DETECTIONS_DATA_STREAM,
        KNOWLEDGE_INDICATORS_DATA_STREAM,
      ]);
      expect(
        internalEsClient.indices.createDataStream.mock.calls.map(([{ name }]) => name)
      ).toEqual([DETECTIONS_DATA_STREAM, KNOWLEDGE_INDICATORS_DATA_STREAM]);
      expect(summary.deleted?.dataStreams).toBe(0);
      expect(summary.partialFailures).toEqual([]);
      expect([...streamDocuments.keys()]).toEqual([
        DETECTIONS_DATA_STREAM,
        KNOWLEDGE_INDICATORS_DATA_STREAM,
      ]);
    });

    it('skips a registered stream after its existence check fails and continues cleanup', async () => {
      const { api } = makeManagementApi();
      const { service, internalEsClient } = makeService({
        management: api,
        dataStreams: {},
      });
      internalEsClient.indices.exists.mockRejectedValueOnce(new Error('existence check failed'));

      const summary = await service.reset({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual({
        target: `data-stream:${DETECTIONS_DATA_STREAM}`,
        error: 'existence check failed',
      });
      expect(internalEsClient.indices.createDataStream).not.toHaveBeenCalledWith({
        name: DETECTIONS_DATA_STREAM,
      });
      expect(internalEsClient.indices.createDataStream).toHaveBeenCalledWith({
        name: KNOWLEDGE_INDICATORS_DATA_STREAM,
      });
    });

    it('leaves a registered stream untouched when its initializer fails', async () => {
      const { api } = makeManagementApi();
      const { service, initializeClient, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 3 },
      });
      initializeClient.mockRejectedValueOnce(new Error('template install failed'));

      const summary = await service.reset({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual({
        target: `data-stream:${DETECTIONS_DATA_STREAM}:initialize`,
        error: 'template install failed',
      });
      expect(esClient.deleteByQuery).not.toHaveBeenCalledWith(
        expect.objectContaining({ index: DETECTIONS_DATA_STREAM })
      );
      expect(summary.deleted?.dataStreams).toBe(0);
    });

    it('refreshes registered streams before snapshotting and deleting documents', async () => {
      const { api } = makeManagementApi();
      const { service, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });

      await service.reset({ request: REQUEST });

      expect(esClient.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.deleteByQuery.mock.invocationCallOrder[0]
      );
    });

    it('skips document deletion when refresh is denied', async () => {
      const { api } = makeManagementApi();
      const { service, esClient } = makeService({ management: api });
      esClient.indices.refresh.mockRejectedValue(new Error('refresh denied'));

      const summary = await service.reset({ request: REQUEST });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(summary.deleted?.dataStreams).toBe(0);
      expect(summary.partialFailures).toContainEqual({
        target: `data-stream:${DETECTIONS_DATA_STREAM}:refresh`,
        error: 'refresh denied',
      });
    });

    it('does not report indicators or queries as deleted when their stream could not be wiped', async () => {
      const { api } = makeManagementApi();
      const { service, esClient } = makeService({
        management: api,
        indicatorStreams: ['logs.web'],
        knowledgeIndicatorCounts: { [KI_TYPE_FEATURE]: 2, [KI_TYPE_QUERY]: 1 },
        dataStreams: { [KNOWLEDGE_INDICATORS_DATA_STREAM]: 3 },
      });
      esClient.deleteByQuery.mockImplementation(async ({ index }) => {
        if (index === KNOWLEDGE_INDICATORS_DATA_STREAM) throw new Error('delete failed');
        return { deleted: 0, failures: [], version_conflicts: 0, timed_out: false };
      });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted).toEqual(
        expect.objectContaining({ knowledgeIndicators: 0, storedQueries: 0, dataStreams: 0 })
      );
      expect(summary.partialFailures).toContainEqual({
        target: `data-stream:${KNOWLEDGE_INDICATORS_DATA_STREAM}:delete`,
        error: 'delete failed',
      });
    });

    it('keeps investigations out of the reset scope', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });
      // A paused space keeps its document through reset, so the stored summary can be read back.
      await service.pause({ request: REQUEST });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted).not.toHaveProperty('investigations');
      expect(summary.partialFailures).not.toContainEqual(
        expect.objectContaining({ target: expect.stringContaining('investigation') })
      );
      // Released model versions require the count, so the stored summary still carries a 0.
      const stored = soClient.readDocument('default') as {
        lastSummary?: { deleted?: { investigations?: number } };
      };
      expect(stored.lastSummary?.deleted?.investigations).toBe(0);
      expect(
        (await service.getStatus({ request: REQUEST })).lastSummary?.deleted
      ).not.toHaveProperty('investigations');
    });

    it('restores non-settings workflows after a paused reset but leaves settings-backed workflows off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, spaceUiSettingsClient, soClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      const summary = await service.reset({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(summary.workflowsDisabled).toBe(0);
      expect(updateWorkflow).toHaveBeenCalledWith(
        cleanupDocumentId('default'),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) => id === continuousDocumentId('default') && patch.enabled === true
        )
      ).toBe(false);
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) =>
            id.startsWith(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID) &&
            patch.enabled === true
        )
      ).toBe(false);
      expect(
        spaceUiSettingsClient._store.get(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
      ).toBe(false);
      expect(
        spaceUiSettingsClient._store.get(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
        )
      ).toBe(false);
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as Record<string, unknown>;
      expect(lastWrite.pausedSettings).toBeUndefined();
    });

    it('keeps a settings-backed workflow running when its toggle could not be turned off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        failContinuousSet: true,
      });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual(
        expect.objectContaining({ target: 'settings:continuous-onboarding@default' })
      );
      expect(updateWorkflow).toHaveBeenCalledWith(
        continuousDocumentId('default'),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) =>
            id.startsWith(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID) &&
            patch.enabled === true
        )
      ).toBe(false);
      expect(summary.workflowsDisabled).toBe(0);
    });

    it('leaves the continuous onboarding document off when its toggle was already off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({
        management: api,
        continuousOnboardingEnabled: false,
        failContinuousSet: true,
      });

      const summary = await service.reset({ request: REQUEST });

      // The toggle reads off, so no write is attempted and nothing needs restoring.
      expect(summary.partialFailures).not.toContainEqual(
        expect.objectContaining({ target: 'settings:continuous-onboarding@default' })
      );
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) => id === continuousDocumentId('default') && patch.enabled === true
        )
      ).toBe(false);
    });

    it('never restores or changes continuous onboarding in a different space', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, getInternalSpaceUiSettingsClient } = makeService({
        management: api,
        spaceIds: ['default', 'space-a'],
        continuousOnboardingEnabled: true,
      });
      // Only space-a refuses to turn the toggle off.
      const spaceA = getInternalSpaceUiSettingsClient('space-a');
      spaceA.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED) {
          throw new Error('set failed for continuous');
        }
      });

      await service.reset({ request: REQUEST });

      const reEnabledIds = updateWorkflow.mock.calls
        .filter(([, patch]) => patch.enabled === true)
        .map(([id]) => id);
      expect(reEnabledIds).not.toContain(continuousDocumentId('space-a'));
      expect(spaceA.set).not.toHaveBeenCalled();
      expect(reEnabledIds).not.toContain(continuousDocumentId('default'));
    });

    it('keeps failed workflow re-enables as retry inventory for Resume', async () => {
      const failEnableFor: { id?: string } = { id: cleanupDocumentId('default') };
      const { api, updateWorkflow } = makeManagementApi({ failEnableFor });
      const { service, soClient } = makeService({ management: api });

      const resetSummary = await service.reset({ request: REQUEST });
      expect(resetSummary.state).toBe('enabled');
      expect(resetSummary.workflowsDisabled).toBe(1);
      expect(resetSummary.partialFailures).toContainEqual({
        spaceId: 'default',
        target: expect.stringContaining(cleanupDocumentId('default')),
        error: expect.stringContaining('enable failed'),
      });
      // What could not be restored stays on the space's document, even though reset created it.
      expect(soClient.readDocument('default')).toEqual(
        expect.objectContaining({
          state: 'enabled',
          disabledWorkflows: [{ id: cleanupDocumentId('default'), spaceId: 'default' }],
        })
      );

      failEnableFor.id = undefined;
      updateWorkflow.mockClear();
      const resumeSummary = await service.resume({ request: REQUEST });

      expect(resumeSummary.workflowsDisabled).toBe(0);
      expect(updateWorkflow).toHaveBeenCalledWith(
        cleanupDocumentId('default'),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        disabledWorkflows: unknown[];
      };
      expect(lastWrite.disabledWorkflows).toEqual([]);
    });

    it('ignores missing rules while reporting other per-rule deletion failures', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        deleteErrors: [
          {
            id: 'missing-rule',
            error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'not found' },
          },
          {
            id: 'failed-rule',
            error: { code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'delete failed' },
          },
        ],
      });
      const { service } = makeService({
        management: api,
        v2RulesClient,
        ownedRuleStreams: ['logs.rules'],
        ownedRuleIdsBySource: {
          'logs.rules': ['ok-rule', 'missing-rule', 'failed-rule'],
        },
      });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted?.rules).toBe(1);
      expect(summary.partialFailures).toContainEqual({
        spaceId: 'default',
        target: 'rule:failed-rule',
        error: 'delete failed',
      });
      expect(summary.partialFailures).not.toContainEqual(
        expect.objectContaining({ target: 'rule:missing-rule' })
      );
    });

    it('keeps pause-disabled rules whose deletion failed as retry inventory', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        deleteErrors: [
          {
            id: 'paused-rule',
            error: { code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'delete failed' },
          },
          {
            id: 'new-rule',
            error: { code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'delete failed' },
          },
        ],
      });
      const { service, soClient } = makeService({
        management: api,
        v2RulesClient,
        ruleBackedRuleIds: ['paused-rule'],
        ownedRuleStreams: ['logs.rules'],
        ownedRuleIdsBySource: { 'logs.rules': ['new-rule'] },
      });
      await service.pause({ request: REQUEST });

      const summary = await service.reset({ request: REQUEST });

      // Only rules pause disabled belong in the inventory; `new-rule` was never toggled.
      expect(summary.rulesDisabled).toBe(1);
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({
          state: 'enabled',
          disabledRules: [{ id: 'paused-rule', spaceId: 'default' }],
        }),
        expect.anything()
      );
    });

    it('is cleanly repeatable and reports zero deleted data streams on the second reset', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({
        management: api,
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 1,
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: 1,
          [DISCOVERIES_DATA_STREAM]: 1,
        },
      });

      expect((await service.reset({ request: REQUEST })).deleted?.dataStreams).toBe(3);
      const second = await service.reset({ request: REQUEST });

      expect(second.deleted).toEqual({
        knowledgeIndicators: 0,
        storedQueries: 0,
        rules: 0,
        dataStreams: 0,
      });
      expect(second.partialFailures).toEqual([]);
    });

    it('fails before destructive work when reset intent cannot be persisted', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, esClient } = makeService({ management: api });
      soClient.create.mockRejectedValueOnce(new Error('reset intent write failed'));

      await expect(service.reset({ request: REQUEST })).rejects.toThrow(
        'reset intent write failed'
      );

      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('aborts before destructive work when a toggle cannot be read, instead of treating it as off', async () => {
      const { api } = makeManagementApi();
      const { service, esClient, getInternalSpaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
      });
      getInternalSpaceUiSettingsClient('default').get.mockRejectedValueOnce(
        new Error('settings read failed')
      );

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('settings read failed');

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('does not enumerate or authorize other spaces', async () => {
      const { api } = makeManagementApi();
      const { service, savedObjects } = makeService({ management: api, spacesGetAllThrows: true });
      await expect(service.reset({ request: REQUEST })).resolves.toMatchObject({
        state: 'enabled',
        partialFailures: [],
      });
      expect(savedObjects.createInternalRepository).not.toHaveBeenCalled();
    });

    it('persists the swept workflows while still paused before destroying data', async () => {
      const { api } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });

      await service.reset({ request: REQUEST });

      const inventoryWrite = soClient.create.mock.calls[1][1] as {
        state: string;
        disabledWorkflows: Array<{ id: string }>;
      };
      expect(inventoryWrite.state).toBe('paused');
      expect(inventoryWrite.disabledWorkflows.map(({ id }) => id)).toContain(
        cleanupDocumentId('default')
      );
      expect(soClient.create.mock.invocationCallOrder[1]).toBeLessThan(
        esClient.deleteByQuery.mock.invocationCallOrder[0]
      );
    });

    it('fails before destructive work when the swept inventory cannot be persisted', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });
      soClient.create
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error('inventory write failed'));

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('inventory write failed');

      // The sweep is rolled back so the unrecorded workflows are not stranded.
      expect(updateWorkflow).toHaveBeenCalledWith(
        cleanupDocumentId('default'),
        { enabled: false },
        expect.any(String),
        REQUEST
      );
      expect(updateWorkflow).toHaveBeenCalledWith(
        cleanupDocumentId('default'),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('throws when the final maintenance state write fails after destructive side effects', async () => {
      // A workflow that cannot be restored stays on the document, so the final write is needed.
      const { api } = makeManagementApi({ failEnableFor: cleanupDocumentId('default') });
      const { service, soClient, esClient } = makeService({
        management: api,
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 1,
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: 0,
        },
      });
      soClient.create
        .mockResolvedValueOnce({} as never) // paused intent
        .mockResolvedValueOnce({} as never) // swept inventory
        .mockRejectedValueOnce(new Error('reset state write failed'));

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('reset state write failed');
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: DETECTIONS_DATA_STREAM,
          query: { term: { 'kibana.space_ids': 'default' } },
        })
      );
    });

    it('falls back to enabled state when removal of a reset-created document fails', async () => {
      const { service, soClient } = makeService({ management: makeManagementApi().api });
      soClient.delete.mockRejectedValueOnce(new Error('document removal failed'));

      await service.reset({ request: REQUEST });

      expect(soClient.readDocument('default')).toMatchObject({ state: 'enabled' });
    });

    it('preserves a preceding pause when reset aborts before cleanup', async () => {
      const { service, soClient, esClient, getInternalSpaceUiSettingsClient } = makeService({
        management: makeManagementApi().api,
      });
      await service.pause({ request: REQUEST });
      const before = soClient.readDocument('default');
      getInternalSpaceUiSettingsClient('default').get.mockRejectedValueOnce(
        new Error('unreadable toggle')
      );

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('unreadable toggle');

      expect(soClient.readDocument('default')).toEqual(before);
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });
});
