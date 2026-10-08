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
  REQUEST,
  cleanupDocumentId,
  continuousDocumentId,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
  requestInSpace,
} from './maintenance_service.test_helpers';

describe('SignificantEventsMaintenanceService', () => {
  describe('reset', () => {
    it('deletes the snapshot, owned rules, investigations, and populated streams while healing registered streams', async () => {
      const { api, cancelAllActiveWorkflowExecutions } = makeManagementApi();
      const {
        service,
        soClient,
        v2RulesClient,
        esClient,
        internalEsClient,
        streamDocuments,
        deleteAllInvestigations,
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
        investigations: { deleted: 2, failures: [] },
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
            investigations: 2,
            dataStreams: 3,
          },
          partialFailures: [],
        })
      );
      expect(v2RulesClient?.bulkDeleteRules).toHaveBeenCalledWith({
        ids: ['linked-rule', 'owned-rule', 'orphan-rule'],
      });
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith(
        {
          name: DETECTIONS_DATA_STREAM,
        },
        { ignore: [404] }
      );
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith(
        { name: DISCOVERIES_DATA_STREAM },
        { ignore: [404] }
      );
      expect(internalEsClient.indices.createDataStream).toHaveBeenCalledWith({
        name: DETECTIONS_DATA_STREAM,
      });
      expect(internalEsClient.indices.createDataStream).toHaveBeenCalledWith({
        name: KNOWLEDGE_INDICATORS_DATA_STREAM,
      });
      expect(internalEsClient.indices.createDataStream).not.toHaveBeenCalledWith({
        name: DISCOVERIES_DATA_STREAM,
      });
      expect(streamDocuments.get(DETECTIONS_DATA_STREAM)).toBe(0);
      expect(streamDocuments.get(KNOWLEDGE_INDICATORS_DATA_STREAM)).toBe(0);
      expect(streamDocuments.has(DISCOVERIES_DATA_STREAM)).toBe(false);
      expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(esClient.indices.refresh).toHaveBeenCalledWith({
        index: KNOWLEDGE_INDICATORS_DATA_STREAM,
        ignore_unavailable: true,
      });
      expect(esClient.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
        countKnowledgeIndicators.mock.invocationCallOrder[0]
      );
      expect(asScoped).toHaveBeenCalledWith(REQUEST);
      expect(cancelAllActiveWorkflowExecutions.mock.invocationCallOrder[0]).toBeLessThan(
        deleteAllInvestigations!.mock.invocationCallOrder[0]
      );
      expect(soClient.create.mock.calls[0][1]).toEqual(
        expect.objectContaining({ state: 'paused', updatedBy: 'marco' })
      );
      expect(soClient.create.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.indices.deleteDataStream.mock.invocationCallOrder[0]
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

    it('pauses every space through its own document before deleting data, then enables them all', async () => {
      const { api } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        spaceIds: ['default', 'space-a', 'space-b'],
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });
      // A space a user paused earlier keeps a document; the others never had one.
      await service.pause({ request: requestInSpace('space-a'), updatedBy: 'marco' });
      soClient.create.mockClear();

      await service.reset({ request: REQUEST, updatedBy: 'admin' });

      const wipeOrder = esClient.indices.deleteDataStream.mock.invocationCallOrder[0];
      const pausedBeforeWipe = soClient.create.mock.calls
        .map(([, attributes], index) => ({
          state: (attributes as { state: string }).state,
          spaceId: soClient.create.mock.contexts[index].spaceId,
          order: soClient.create.mock.invocationCallOrder[index],
        }))
        .filter(({ state, order }) => state === 'paused' && order < wipeOrder)
        .map(({ spaceId }) => spaceId);
      // space-a was already paused, so only the two spaces without a document are written.
      expect(new Set(pausedBeforeWipe)).toEqual(new Set(['default', 'space-b']));

      // Everything is enabled again: the pre-existing document stays, the created ones go.
      expect(soClient.readDocument('space-a')).toEqual(
        expect.objectContaining({ state: 'enabled', updatedBy: 'admin' })
      );
      expect(soClient.readDocument('default')).toBeUndefined();
      expect(soClient.readDocument('space-b')).toBeUndefined();
      for (const spaceId of ['default', 'space-a', 'space-b']) {
        await expect(service.getState({ request: requestInSpace(spaceId) })).resolves.toBe(
          'enabled'
        );
      }
    });

    it('refuses to delete shared data when a space cannot be marked paused first', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        spaceIds: ['default', 'space-a'],
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });
      // The first space is marked, the second one is not.
      soClient.create
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error('space-a intent write failed'));

      await expect(service.reset({ request: REQUEST })).rejects.toThrow(
        'space-a intent write failed'
      );

      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('refuses to delete shared data when it cannot list every space', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
        internalSpacesThrow: true,
      });

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('spaces finder failed');

      expect(soClient.create).not.toHaveBeenCalled();
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('sweeps every space, including those the caller cannot see', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({
        management: api,
        spaceIds: ['default'],
        internalSpaceIds: ['default', 'space-a'],
      });

      await service.reset({ request: REQUEST });

      expect(
        updateWorkflow.mock.calls.some(
          ([id, , spaceId]) => id === cleanupDocumentId('space-a') && spaceId === 'space-a'
        )
      ).toBe(true);
    });

    it('releases the spaces it paused when pausing a later space fails', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        spaceIds: ['default', 'space-a'],
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });
      const createDocument = soClient.create.getMockImplementation();
      if (!createDocument) {
        throw new Error('Missing saved objects client fixture');
      }
      soClient.create
        .mockImplementationOnce(createDocument)
        .mockRejectedValueOnce(new Error('so write failed'));

      await expect(service.reset({ request: REQUEST })).rejects.toThrow('so write failed');

      expect(soClient.readDocument('default')).toBeUndefined();
      expect(soClient.readDocument('space-a')).toBeUndefined();
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('records a space-specific failure only in the document of that space', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        spaceIds: ['default', 'space-a'],
        investigations: {
          deleted: 0,
          failures: [{ id: 'inv-1', spaceId: 'space-a', error: 'delete failed' }],
        },
      });
      // A space that keeps a recorded target keeps its document, so its summary is readable.
      await service.pause({ request: REQUEST });
      await service.pause({ request: requestInSpace('space-a') });

      await service.reset({ request: REQUEST });

      const failuresIn = (spaceId: string) =>
        (
          soClient.readDocument(spaceId) as {
            lastSummary: { partialFailures: Array<{ target: string }> };
          }
        ).lastSummary.partialFailures.map(({ target }) => target);
      expect(failuresIn('space-a')).toContain('investigation:inv-1@space-a');
      expect(failuresIn('default')).not.toContain('investigation:inv-1@space-a');
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
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalledWith(
        { name: DETECTIONS_DATA_STREAM },
        expect.anything()
      );
      expect(summary.deleted?.dataStreams).toBe(0);
    });

    it('refreshes a registered stream before counting so unrefreshed writes are wiped', async () => {
      const { api } = makeManagementApi();
      const { service, esClient, internalEsClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 1 },
      });

      await service.reset({ request: REQUEST });

      expect(esClient.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
        internalEsClient.count.mock.invocationCallOrder[0]
      );
    });

    it('still trusts the count when the refresh is denied, so empty streams are not wiped', async () => {
      const { api } = makeManagementApi();
      const { service, esClient } = makeService({ management: api });
      esClient.indices.refresh.mockRejectedValue(new Error('refresh denied'));

      const summary = await service.reset({ request: REQUEST });

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
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
      esClient.indices.deleteDataStream.mockRejectedValueOnce(new Error('delete failed'));

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted).toEqual(
        expect.objectContaining({ knowledgeIndicators: 0, storedQueries: 0, dataStreams: 0 })
      );
      expect(summary.partialFailures).toContainEqual({
        target: `data-stream:${KNOWLEDGE_INDICATORS_DATA_STREAM}:delete`,
        error: 'delete failed',
      });
    });

    it('records a partial failure when the investigations plugin is unavailable', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({ management: api, investigations: null });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted?.investigations).toBe(0);
      expect(summary.partialFailures).toContainEqual({
        target: 'investigations',
        error: 'Investigations plugin is not available',
      });
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

    it('restores the continuous onboarding document only in spaces whose toggle is still on', async () => {
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
      expect(reEnabledIds).toContain(continuousDocumentId('space-a'));
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
        investigations: 0,
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
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
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
        esClient.indices.deleteDataStream.mock.invocationCallOrder[0]
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
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
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
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith(
        {
          name: DETECTIONS_DATA_STREAM,
        },
        { ignore: [404] }
      );
    });
  });
});
