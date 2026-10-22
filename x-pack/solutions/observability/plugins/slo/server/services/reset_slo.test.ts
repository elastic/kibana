/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { SecurityException } from '../errors';
import { createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { ResetSLO } from './reset_slo';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
import type { SLODefinition } from '../domain/models';

const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('ResetSLO', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  let resetSLO: ResetSLO;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    resetSLO = new ResetSLO(
      mockScopedClusterClient,
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      loggerMock,
      'some-space',
      httpServiceMock.createStartContract().basePath
    );
    jest.useFakeTimers().setSystemTime(TEST_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
    });

    it('resets all associated resources', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockRepository.update.mockImplementation((v) => Promise.resolve(v));

      await resetSLO.execute(slo.id);

      // delete existing resources and data
      expectDeletionOfOriginalSLOResources(slo);

      // install resources
      expectInstallationOfResetedSLOResources();

      // save reseted SLO
      expect(mockRepository.update).toHaveBeenCalledWith({
        ...slo,
        revision: slo.revision + 1,
        version: SLO_MODEL_VERSION,
        updatedAt: expect.anything(),
      });
    });
  });

  describe('unhappy path', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as SecurityHasPrivilegesResponse);
    });

    it('throws a SecurityException error when the user does not have the required privileges', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await expect(resetSLO.execute(slo.id)).rejects.toThrow(
        "Missing ['read', 'view_index_metadata'] privileges on the source index [metrics-apm*]"
      );
    });
  });

  describe('when resource installation fails', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        application: {},
        cluster: {},
        has_all_requested: true,
        index: {},
        username: 'some-user',
      });
    });

    it('waits for in-flight install operations to settle before rolling back', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      let resolveSummaryInstall: (value: string) => void = () => {};
      mockSummaryTransformManager.install.mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveSummaryInstall = resolve;
        })
      );
      mockTransformManager.install.mockRejectedValueOnce(
        Object.assign(new Error('forbidden'), {
          meta: { body: { error: { type: 'security_exception', reason: 'missing privileges' } } },
        })
      );
      const resetedRollupTransformId = getSLOTransformId(slo.id, slo.revision + 1);
      const resetedSummaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision + 1);

      const executePromise = resetSLO.execute(slo.id);
      const assertion = expect(executePromise).rejects.toBeInstanceOf(SecurityException);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockScopedClusterClient.asCurrentUser.delete).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).not.toHaveBeenCalledWith(resetedRollupTransformId);
      expect(mockSummaryTransformManager.uninstall).not.toHaveBeenCalledWith(
        resetedSummaryTransformId
      );
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(1);

      resolveSummaryInstall(resetedSummaryTransformId);
      await assertion;
      await expect(executePromise).rejects.toThrow('missing privileges');

      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(resetedRollupTransformId);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(resetedSummaryTransformId);
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(3);
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  function expectDeletionOfOriginalSLOResources(originalSlo: SLODefinition) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    const summaryTransformId = getSLOSummaryTransformId(originalSlo.id, originalSlo.revision);

    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(transformId);
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId);

    // rollup and summary pipelines using wildcard pipeline
    expect(
      mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
    ).toHaveBeenNthCalledWith(
      1,
      { id: getWildcardPipelineId(originalSlo.id, originalSlo.revision) },
      { ignore: [404] }
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
      })
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
      })
    );
  }

  function expectInstallationOfResetedSLOResources() {
    expect(mockTransformManager.install).toHaveBeenCalled();
    expect(mockTransformManager.start).toHaveBeenCalled();

    // rollup and summary pipelines
    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalledTimes(2);

    expect(mockSummaryTransformManager.install).toHaveBeenCalled();
    expect(mockSummaryTransformManager.start).toHaveBeenCalled();

    expect(mockScopedClusterClient.asCurrentUser.index).toHaveBeenCalled();
  }
});
