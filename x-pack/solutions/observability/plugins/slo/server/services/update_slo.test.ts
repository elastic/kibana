/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { UpdateSLOParams } from '@kbn/slo-schema';
import { cloneDeep, omit, pick } from 'lodash';

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import type { SLODefinition } from '../domain/models';
import { SLOOperationTimeout } from '../errors';
import { REQUEST_DEADLINE_MS } from '../utils/with_deadline';
import type { SloTelemetryReporter } from '../lib/telemetry';
import { hashSloId } from '../lib/telemetry/build_slo_ebt_data';
import {
  createSloTelemetryReporterMock,
  getReportedEvents,
} from '../lib/telemetry/slo_telemetry_service.mock';
import { fiveMinute, oneMinute } from './fixtures/duration';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from './fixtures/slo';
import { weeklyCalendarAligned } from './fixtures/time_window';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
import { UpdateSLO } from './update_slo';

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('UpdateSLO', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockLogger: jest.Mocked<MockedLogger>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockTelemetry: jest.Mocked<SloTelemetryReporter>;
  let updateSLO: UpdateSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockTelemetry = createSloTelemetryReporterMock();
    mockLogger = loggingSystemMock.createLogger();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    updateSLO = new UpdateSLO(
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      mockScopedClusterClient,
      mockLogger,
      'some-space',
      httpServiceMock.createStartContract().basePath,
      'some-user-id',
      mockTelemetry
    );
  });

  describe('when the update does not change the original SLO', () => {
    function expectNoCallsToAnyMocks() {
      expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).not.toHaveBeenCalled();

      expect(mockTransformManager.uninstall).not.toHaveBeenCalled();
      expect(mockTransformManager.install).not.toHaveBeenCalled();
      expect(mockTransformManager.start).not.toHaveBeenCalled();

      expect(mockSummaryTransformManager.uninstall).not.toHaveBeenCalled();
      expect(mockSummaryTransformManager.install).not.toHaveBeenCalled();
      expect(mockSummaryTransformManager.start).not.toHaveBeenCalled();

      expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).not.toHaveBeenCalled();
      expect(mockTelemetry.report).not.toHaveBeenCalled();
    }

    beforeEach(() => {
      mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
    });

    it('returns early with a fully identical SLO payload', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = omit(cloneDeep(slo), [
        'id',
        'revision',
        'createdAt',
        'updatedAt',
        'version',
        'enabled',
      ]);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical name', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['name']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical indicator', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['indicator']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical timeWindow', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['timeWindow']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical budgetingMethod', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['budgetingMethod']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical description', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['description']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical groupBy', async () => {
      const slo = createSLO({ groupBy: 'project.id' });
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['groupBy']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical objective', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['objective']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical tags', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['tags']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical settings', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['settings']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });
  });

  describe('without breaking changes update', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
    });

    describe('when resources are up-to-date', () => {
      beforeEach(() => {
        mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
      });
      it('updates the summary pipeline with the new non-breaking changes', async () => {
        const slo = createSLO();
        mockRepository.findById.mockResolvedValueOnce(slo);
        await updateSLO.execute(slo.id, { name: 'updated name' });

        expectNonBreakingChangeUpdatedResources();
      });

      it('restores the original SLI pipeline instead of deleting it when the summary pipeline update fails', async () => {
        const slo = createSLO();
        mockRepository.findById.mockResolvedValueOnce(slo);
        mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline
          .mockResolvedValueOnce({ acknowledged: true })
          .mockRejectedValueOnce(new Error('summary pipeline error'));

        await expect(updateSLO.execute(slo.id, { name: 'updated name' })).rejects.toThrow(
          'summary pipeline error'
        );

        expect(
          mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
        ).not.toHaveBeenCalled();
        expect(
          mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline
        ).toHaveBeenLastCalledWith(getSLIPipelineTemplate(slo, 'some-space'), {
          signal: expect.any(AbortSignal),
        });
        expect(mockRepository.update).toHaveBeenLastCalledWith(slo);
      });

      it('reports the slo_updated telemetry event without a revision bump', async () => {
        const slo = createSLO();
        mockRepository.findById.mockResolvedValueOnce(slo);

        await updateSLO.execute(slo.id, { name: 'updated name', tags: ['new-tag'] });

        expect(mockTelemetry.report).toHaveBeenCalledTimes(1);
        expect(getReportedEvents(mockTelemetry)).toEqual([
          [
            'slo_updated',
            expect.objectContaining({
              slo_id: hashSloId(slo.id),
              revision_bumped: false,
              changed_fields: ['name', 'tags'],
            }),
          ],
        ]);
      });

      function expectNonBreakingChangeUpdatedResources() {
        expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalled();

        expect(mockTransformManager.install).not.toHaveBeenCalled();
        expect(mockTransformManager.start).not.toHaveBeenCalled();
        expect(mockSummaryTransformManager.install).not.toHaveBeenCalled();
        expect(mockSummaryTransformManager.start).not.toHaveBeenCalled();

        expect(mockScopedClusterClient.asCurrentUser.index).not.toHaveBeenCalled();
      }
    });

    describe('when resources are running on an older version', () => {
      beforeEach(() => {
        mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION - 2);
      });

      it('consideres the non-breaking changes as breaking', async () => {
        const slo = createSLO();
        mockRepository.findById.mockResolvedValueOnce(slo);
        await updateSLO.execute(slo.id, { name: 'updated name' });

        expect(mockRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ...slo,
            name: 'updated name',
            revision: 2,
            updatedAt: expect.anything(),
            updatedBy: 'some-user-id',
          })
        );
        expectInstallationOfUpdatedSLOResources();
        expectDeletionOfOriginalSLOResources(slo);
      });
    });
  });

  describe('with breaking changes update', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
    });

    it('reports the slo_updated telemetry event with a revision bump', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, { groupBy: 'host.name' });

      expect(mockTelemetry.report).toHaveBeenCalledTimes(1);
      expect(getReportedEvents(mockTelemetry)).toEqual([
        [
          'slo_updated',
          expect.objectContaining({
            slo_id: hashSloId(slo.id),
            grouped: true,
            revision_bumped: true,
            changed_fields: ['groupBy'],
          }),
        ],
      ]);
    });

    it('considers a settings change as a breaking change', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);

      const newSettings = {
        ...slo.settings,
        frequency: fiveMinute(),
        preventInitialBackfill: true,
      };
      await updateSLO.execute(slo.id, { settings: newSettings });

      expectDeletionOfOriginalSLOResources(slo);
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ settings: newSettings, revision: 2 })
      );
      expectInstallationOfUpdatedSLOResources();
    });

    it('considers a budgeting method change as a breaking change', async () => {
      const slo = createSLO({ budgetingMethod: 'occurrences' });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        budgetingMethod: 'timeslices',
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.9,
          timesliceWindow: oneMinute(),
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('considers a timeWindow change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        timeWindow: weeklyCalendarAligned(),
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('considers a timeslice target change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.1,
          timesliceWindow: slo.objective.timesliceWindow,
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('considers a timeslice window change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        objective: {
          target: slo.objective.target,
          timesliceTarget: slo.objective.timesliceTarget,
          timesliceWindow: fiveMinute(),
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('considers an indicator change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        indicator: createAPMTransactionErrorRateIndicator(),
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('considers a groupBy change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        groupBy: 'new-field',
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    // SDH #6202: previously the catch block in deleteOriginalSLO swallowed
    // failures silently, leaving stale transforms running and feeding orphan
    // summary documents into the summary index.
    it('logs an error but does not throw when cleanup of the previous revision fails', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const originalRollupTransformId = getSLOTransformId(slo.id, slo.revision);
      mockTransformManager.uninstall.mockImplementation(async (id) => {
        if (id === originalRollupTransformId) {
          throw new Error('boom: ES transient failure while uninstalling old transform');
        }
      });

      await expect(
        updateSLO.execute(slo.id, {
          indicator: createAPMTransactionErrorRateIndicator(),
        })
      ).resolves.not.toThrow();

      expectInstallationOfUpdatedSLOResources();

      const warnMessages = mockLogger.warn.mock.calls.map(([msg]) => String(msg));
      expect(warnMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Failed to clean up resources for previous SLO revision.'),
        ])
      );
    });

    it('passes the deadline signal to the pre-flight checks and the installation', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      const deadlineSignal = { signal: expect.objectContaining({ aborted: false }) };

      await updateSLO.execute(originalSlo.id, {
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'production' }),
      });

      expect(mockSummaryTransformManager.getVersion).toHaveBeenCalledWith(
        expect.any(String),
        deadlineSignal
      );
      expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockTransformManager.install).toHaveBeenCalledWith(expect.any(Object), deadlineSignal);
      expect(mockSummaryTransformManager.start).toHaveBeenCalledWith(
        expect.any(String),
        deadlineSignal
      );
    });

    it('cleans up the previous revision with its own budget once the deadline has passed', async () => {
      jest.useFakeTimers();
      try {
        const slo = createSLO();
        mockRepository.findById.mockResolvedValueOnce(slo);
        mockTransformManager.install.mockImplementationOnce(async (updatedSlo) => {
          await new Promise((resolve) => setTimeout(resolve, REQUEST_DEADLINE_MS - 1));
          return getSLOTransformId(updatedSlo.id, updatedSlo.revision);
        });
        let isCleanupAborted: boolean | undefined;
        mockTransformManager.uninstall.mockImplementationOnce(async (_transformId, { signal }) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          isCleanupAborted = signal.aborted;
        });

        const promise = updateSLO.execute(slo.id, {
          indicator: createAPMTransactionErrorRateIndicator(),
        });
        await jest.advanceTimersByTimeAsync(REQUEST_DEADLINE_MS + 1000);
        await promise;

        expect(isCleanupAborted).toBe(false);
        expectDeletionOfOriginalSLOResources(slo);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('when error happens during the update', () => {
    afterEach(() => {
      expect(mockTelemetry.report).not.toHaveBeenCalled();
    });

    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
    });

    it('throws a SecurityException error when the user does not have the required privileges on the source index', async () => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as SecurityHasPrivilegesResponse);

      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);

      const newIndicator = createAPMTransactionErrorRateIndicator({ index: 'new-index-*' });

      await expect(updateSLO.execute(originalSlo.id, { indicator: newIndicator })).rejects.toThrow(
        "Missing ['read', 'view_index_metadata'] privileges on the source index [new-index-*]"
      );
    });

    it('restores the previous SLO definition when updated summary transform install fails', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await expect(updateSLO.execute(originalSlo.id, { indicator: newIndicator })).rejects.toThrow(
        'Transform install error'
      );

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: SUMMARY_TEMP_INDEX_NAME }),
        expect.objectContaining({ ignore: [404] })
      );
    });

    it('restores the previous SLO definition and rollback succeeded operations until the summary transform start operation fails', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      mockSummaryTransformManager.start.mockRejectedValueOnce(
        new Error('summary transform start error')
      );

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await expect(updateSLO.execute(originalSlo.id, { indicator: newIndicator })).rejects.toThrow(
        'summary transform start error'
      );

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
    });

    it('waits for in-flight install operations to settle before rolling back', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      const pendingSummaryInstall = Promise.withResolvers<string>();
      mockSummaryTransformManager.install.mockReturnValueOnce(pendingSummaryInstall.promise);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      const assertion = expect(
        updateSLO.execute(originalSlo.id, { indicator: newIndicator })
      ).rejects.toThrow('Transform install error');
      await flushPromises();

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.asCurrentUser.delete).not.toHaveBeenCalled();

      pendingSummaryInstall.resolve(
        getSLOSummaryTransformId(originalSlo.id, originalSlo.revision + 1)
      );
      await assertion;

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
    });

    it('waits for in-flight start operations to settle before rolling back', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      mockTransformManager.start.mockRejectedValueOnce(new Error('rollup transform start error'));
      const pendingSummaryStart = Promise.withResolvers<void>();
      mockSummaryTransformManager.start.mockReturnValueOnce(pendingSummaryStart.promise);

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      const assertion = expect(
        updateSLO.execute(originalSlo.id, { indicator: newIndicator })
      ).rejects.toThrow('rollup transform start error');
      await flushPromises();

      expect(mockSummaryTransformManager.start).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.asCurrentUser.delete).not.toHaveBeenCalled();

      pendingSummaryStart.resolve();
      await assertion;

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
    });

    it('throws SLOOperationTimeout and restores the previous definition when the deadline is exceeded', async () => {
      jest.useFakeTimers();
      try {
        const originalSlo = createSLO({
          id: 'original-id',
          indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
        });
        mockRepository.findById.mockResolvedValueOnce(originalSlo);
        mockSummaryTransformManager.install.mockImplementationOnce(
          (_slo, { signal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener('abort', () =>
                reject(new errors.RequestAbortedError('Request aborted'))
              );
            })
        );

        const assertion = expect(
          updateSLO.execute(originalSlo.id, {
            indicator: createAPMTransactionErrorRateIndicator({ environment: 'production' }),
          })
        ).rejects.toBeInstanceOf(SLOOperationTimeout);
        await jest.advanceTimersByTimeAsync(REQUEST_DEADLINE_MS);
        await assertion;

        expect(mockTransformManager.start).not.toHaveBeenCalled();
        expect(mockTransformManager.uninstall).toHaveBeenCalledTimes(1);
        expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledTimes(1);
        expect(mockRepository.update).toHaveBeenLastCalledWith(originalSlo);
      } finally {
        jest.useRealTimers();
      }
    });

    it('rolls back resources in parallel and restores the previous definition last', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));
      const pendingUninstall = Promise.withResolvers<void>();
      mockSummaryTransformManager.uninstall.mockReturnValueOnce(pendingUninstall.promise);

      const assertion = expect(
        updateSLO.execute(originalSlo.id, {
          indicator: createAPMTransactionErrorRateIndicator({ environment: 'production' }),
        })
      ).rejects.toThrow('Transform install error');
      await flushPromises();

      expect(mockTransformManager.uninstall).toHaveBeenCalledTimes(1);
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      pendingUninstall.resolve();
      await assertion;

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockRepository.update).toHaveBeenLastCalledWith(originalSlo);
    });
  });

  describe('Update also updates updatedBy field', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
    });

    it('updates the updatedBy field with the user id', async () => {
      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await updateSLO.execute(originalSlo.id, { indicator: newIndicator });

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ updatedBy: 'some-user-id' })
      );
    });
  });

  function expectInstallationOfUpdatedSLOResources() {
    expect(mockTransformManager.install).toHaveBeenCalled();
    expect(mockTransformManager.start).toHaveBeenCalled();

    // rollup and summary pipelines using wildcard pipeline id
    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalled();

    expect(mockSummaryTransformManager.install).toHaveBeenCalled();
    expect(mockSummaryTransformManager.start).toHaveBeenCalled();

    expect(mockScopedClusterClient.asCurrentUser.index).toHaveBeenCalled();
  }

  function expectDeletionOfOriginalSLOResources(originalSlo: SLODefinition) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    const summaryTransformId = getSLOSummaryTransformId(originalSlo.id, originalSlo.revision);

    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(transformId, {
      signal: expect.any(AbortSignal),
    });
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId, {
      signal: expect.any(AbortSignal),
    });

    // rollup and summary pipelines
    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline).toHaveBeenCalledTimes(
      1
    );

    expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: SLI_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
          },
        },
      }),
      { signal: expect.any(AbortSignal) }
    );
    expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
          },
        },
      }),
      { signal: expect.any(AbortSignal) }
    );
  }
});
