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
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../knowledge_indicators';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { DISCOVERIES_DATA_STREAM } from '../significant_events/discoveries_data_stream';
import { EVENTS_DATA_STREAM } from '../significant_events/events/data_stream';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';
import {
  REQUEST,
  makeManagementApi,
  makeV2RulesClient,
  makeService,
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
        queryLinksByStream: {
          'logs.web': [{ rule_backed: true, rule_id: 'linked-rule' }, { rule_backed: false }],
        },
        knowledgeIndicatorCounts: { [KI_TYPE_FEATURE]: 2, [KI_TYPE_QUERY]: 2 },
        ownedRuleIdsByStream: {
          'logs.web': ['linked-rule', 'owned-rule'],
          'logs.orphan': ['orphan-rule'],
        },
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 3,
          [EVENTS_DATA_STREAM]: 0,
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: 4,
          [DISCOVERIES_DATA_STREAM]: 4,
        },
        investigations: {
          investigationData: {
            investigations: 2,
            subjects: 3,
            subjectClaims: 3,
            impact: 2,
            hypotheses: 2,
          },
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
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalledWith({
        name: EVENTS_DATA_STREAM,
      });
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
      expect(streamDocuments.get(EVENTS_DATA_STREAM)).toBe(0);
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
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({
          state: 'enabled',
          updatedBy: 'marco',
          disabledWorkflows: [],
          disabledRuleIds: [],
        }),
        { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
      );
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
        EVENTS_DATA_STREAM,
        KNOWLEDGE_INDICATORS_DATA_STREAM,
      ]);
      expect(
        internalEsClient.indices.createDataStream.mock.calls.map(([{ name }]) => name)
      ).toEqual([DETECTIONS_DATA_STREAM, EVENTS_DATA_STREAM, KNOWLEDGE_INDICATORS_DATA_STREAM]);
      expect(summary.deleted?.dataStreams).toBe(0);
      expect(summary.partialFailures).toEqual([]);
      expect([...streamDocuments.keys()]).toEqual([
        DETECTIONS_DATA_STREAM,
        EVENTS_DATA_STREAM,
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
        name: EVENTS_DATA_STREAM,
      });
      expect(internalEsClient.indices.createDataStream).toHaveBeenCalledWith({
        name: KNOWLEDGE_INDICATORS_DATA_STREAM,
      });
    });

    it('leaves a registered stream untouched when its initializer fails', async () => {
      const { api } = makeManagementApi();
      const { service, initializeClient, esClient } = makeService({
        management: api,
        dataStreams: { [DETECTIONS_DATA_STREAM]: 3, [EVENTS_DATA_STREAM]: 2 },
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
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith(
        { name: EVENTS_DATA_STREAM },
        expect.anything()
      );
      expect(summary.deleted?.dataStreams).toBe(1);
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

    it('records a partial failure when agentic investigations is unavailable', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({ management: api, investigations: {} });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.deleted?.investigations).toBe(0);
      expect(summary.partialFailures).toContainEqual({
        target: 'investigations',
        error: 'Agentic investigations plugin is not available',
      });
    });

    it('restores non-settings workflows after a paused reset but leaves settings-backed workflows off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, globalUiSettingsClient, spaceUiSettingsClient, soClient } = makeService({
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
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) =>
            id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID && patch.enabled === true
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
        globalUiSettingsClient._store.get(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED)
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
        expect.objectContaining({ target: 'settings:continuous-onboarding' })
      );
      expect(updateWorkflow).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
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

    it('leaves a settings-backed workflow off when its toggle write fails but the toggle is already off', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({
        management: api,
        continuousOnboardingEnabled: false,
        failContinuousSet: true,
      });

      const summary = await service.reset({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual(
        expect.objectContaining({ target: 'settings:continuous-onboarding' })
      );
      expect(
        updateWorkflow.mock.calls.some(
          ([id, patch]) =>
            id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID && patch.enabled === true
        )
      ).toBe(false);
    });

    it('keeps failed workflow re-enables as retry inventory for Resume', async () => {
      const failEnableFor: { id?: string } = { id: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID };
      const { api, updateWorkflow } = makeManagementApi({ failEnableFor });
      const { service, soClient } = makeService({ management: api });

      const resetSummary = await service.reset({ request: REQUEST });
      expect(resetSummary.state).toBe('enabled');
      expect(resetSummary.workflowsDisabled).toBe(1);
      expect(resetSummary.partialFailures).toContainEqual({
        target: expect.stringContaining(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID),
        error: expect.stringContaining('enable failed'),
      });

      failEnableFor.id = undefined;
      updateWorkflow.mockClear();
      const resumeSummary = await service.resume({ request: REQUEST });

      expect(resumeSummary.workflowsDisabled).toBe(0);
      expect(updateWorkflow).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
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
        ownedRuleIdsByStream: {
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
        ownedRuleIdsByStream: { 'logs.rules': ['new-rule'] },
      });
      await service.pause({ request: REQUEST });

      const summary = await service.reset({ request: REQUEST });

      // Only rules pause disabled belong in the inventory; `new-rule` was never toggled.
      expect(summary.rulesDisabled).toBe(1);
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({ state: 'enabled', disabledRuleIds: ['paused-rule'] }),
        expect.anything()
      );
    });

    it('is cleanly repeatable and reports zero deleted data streams on the second reset', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({
        management: api,
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 1,
          [EVENTS_DATA_STREAM]: 1,
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: 1,
          [DISCOVERIES_DATA_STREAM]: 1,
        },
      });

      expect((await service.reset({ request: REQUEST })).deleted?.dataStreams).toBe(4);
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
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID
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
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
        { enabled: false },
        expect.any(String),
        REQUEST
      );
      expect(updateWorkflow).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('throws when the final maintenance state write fails after destructive side effects', async () => {
      const { api } = makeManagementApi();
      const { service, soClient, esClient } = makeService({
        management: api,
        dataStreams: {
          [DETECTIONS_DATA_STREAM]: 1,
          [EVENTS_DATA_STREAM]: 0,
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
