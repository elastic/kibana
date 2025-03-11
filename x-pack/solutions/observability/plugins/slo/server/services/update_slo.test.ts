/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
  ScopedClusterClientMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { UpdateSLOParams } from '@kbn/slo-schema';
import { cloneDeep, omit, pick } from 'lodash';

import { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { SLODefinition } from '../domain/models';
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
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { UpdateSLO } from './update_slo';

describe('UpdateSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: ElasticsearchClientMock;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockLogger: jest.Mocked<MockedLogger>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let updateSLO: UpdateSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockLogger = loggingSystemMock.createLogger();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    updateSLO = new UpdateSLO(
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      mockEsClient,
      mockScopedClusterClient,
      mockLogger,
      'some-space',
      httpServiceMock.createStartContract().basePath,
      'some-user-id'
    );
  });

  describe('when the update does not change the original SLO', () => {
    function expectNoCallsToAnyMocks() {
      expect(mockEsClient.security.hasPrivileges).not.toBeCalled();

      expect(mockTransformManager.stop).not.toBeCalled();
      expect(mockTransformManager.uninstall).not.toBeCalled();
      expect(mockTransformManager.install).not.toBeCalled();
      expect(mockTransformManager.start).not.toBeCalled();

      expect(mockSummaryTransformManager.stop).not.toBeCalled();
      expect(mockSummaryTransformManager.uninstall).not.toBeCalled();
      expect(mockSummaryTransformManager.install).not.toBeCalled();
      expect(mockSummaryTransformManager.start).not.toBeCalled();

      expect(mockEsClient.deleteByQuery).not.toBeCalled();
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).not.toBeCalled();
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
      mockEsClient.security.hasPrivileges.mockResolvedValue({
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

      function expectNonBreakingChangeUpdatedResources() {
        expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalled();

        expect(mockTransformManager.install).not.toHaveBeenCalled();
        expect(mockTransformManager.start).not.toHaveBeenCalled();
        expect(mockSummaryTransformManager.install).not.toHaveBeenCalled();
        expect(mockSummaryTransformManager.start).not.toHaveBeenCalled();

        expect(mockEsClient.index).not.toHaveBeenCalled();
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
      mockEsClient.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
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
  });

  describe('when error happens during the update', () => {
    beforeEach(() => {
      mockEsClient.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSummaryTransformManager.getVersion.mockResolvedValue(SLO_RESOURCES_VERSION);
    });

    it('throws a SecurityException error when the user does not have the required privileges on the source index', async () => {
      mockEsClient.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as SecurityHasPrivilegesResponse);

      const originalSlo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(originalSlo);

      const newIndicator = createAPMTransactionErrorRateIndicator({ index: 'new-index-*' });

      await expect(
        updateSLO.execute(originalSlo.id, { indicator: newIndicator })
      ).rejects.toThrowError(
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

      await expect(
        updateSLO.execute(originalSlo.id, { indicator: newIndicator })
      ).rejects.toThrowError('Transform install error');

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(1); // for the sli only

      expect(mockSummaryTransformManager.stop).not.toHaveBeenCalled();
      expect(mockSummaryTransformManager.uninstall).not.toHaveBeenCalled();
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).not.toHaveBeenCalled();
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

      await expect(
        updateSLO.execute(originalSlo.id, { indicator: newIndicator })
      ).rejects.toThrowError('summary transform start error');

      expect(mockRepository.update).toHaveBeenCalledWith(originalSlo);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline).toHaveBeenCalled();
      expect(mockTransformManager.stop).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();

      expect(mockSummaryTransformManager.stop).not.toHaveBeenCalled();
    });
  });

  describe('Update also updates updatedBy field', () => {
    beforeEach(() => {
      mockEsClient.security.hasPrivileges.mockResolvedValue({
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

    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalled();

    expect(mockSummaryTransformManager.install).toHaveBeenCalled();
    expect(mockSummaryTransformManager.start).toHaveBeenCalled();

    expect(mockEsClient.index).toHaveBeenCalled();
  }

  function expectDeletionOfOriginalSLOResources(originalSlo: SLODefinition) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    expect(mockTransformManager.stop).toHaveBeenCalledWith(transformId);
    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(transformId);

    const summaryTransformId = getSLOSummaryTransformId(originalSlo.id, originalSlo.revision);
    expect(mockSummaryTransformManager.stop).toHaveBeenCalledWith(summaryTransformId);
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId);

    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline).toHaveBeenCalled();

    expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
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
      })
    );
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
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
      })
    );
  }
});
