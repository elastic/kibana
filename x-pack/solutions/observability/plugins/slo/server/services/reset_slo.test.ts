/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
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
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import type { SloTelemetryReporter } from '../lib/telemetry';
import { hashSloId } from '../lib/telemetry/build_slo_ebt_data';
import {
  createSloTelemetryReporterMock,
  getReportedEvents,
} from '../lib/telemetry/slo_telemetry_service.mock';
import { ResetSLO } from './reset_slo';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
import type { SLODefinition } from '../domain/models';
import { SLOOperationTimeout } from '../errors';
import { REQUEST_DEADLINE_MS } from '../utils/with_deadline';

const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('ResetSLO', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  let mockTelemetry: jest.Mocked<SloTelemetryReporter>;
  let resetSLO: ResetSLO;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockTelemetry = createSloTelemetryReporterMock();
    resetSLO = new ResetSLO(
      mockScopedClusterClient,
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      loggerMock,
      'some-space',
      httpServiceMock.createStartContract().basePath,
      mockTelemetry
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

    it('reports the slo_reset telemetry event', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockRepository.update.mockImplementation((v) => Promise.resolve(v));

      await resetSLO.execute(slo.id);

      expect(mockTelemetry.report).toHaveBeenCalledTimes(1);
      expect(getReportedEvents(mockTelemetry)).toEqual([
        ['slo_reset', expect.objectContaining({ slo_id: hashSloId('irrelevant') })],
      ]);
    });
  });

  describe('deadline signal', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        application: {},
        cluster: {},
        has_all_requested: true,
        index: {},
        username: 'some-user',
      });
    });

    it('passes the deadline signal to every Elasticsearch operation', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockRepository.update.mockImplementation((v) => Promise.resolve(v));
      const deadlineSignal = { signal: expect.objectContaining({ aborted: false }) };

      await resetSLO.execute(slo.id);

      expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockScopedClusterClient.asCurrentUser.index).toHaveBeenCalledWith(
        expect.any(Object),
        deadlineSignal
      );
      expect(mockTransformManager.install).toHaveBeenCalledWith(expect.any(Object), deadlineSignal);
      expect(mockSummaryTransformManager.start).toHaveBeenCalledWith(
        expect.any(String),
        deadlineSignal
      );
    });
  });

  describe('unhappy path', () => {
    afterEach(() => {
      expect(mockTelemetry.report).not.toHaveBeenCalled();
    });

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
    afterEach(() => {
      expect(mockTelemetry.report).not.toHaveBeenCalled();
    });

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
      const pendingSummaryInstall = Promise.withResolvers<string>();
      mockSummaryTransformManager.install.mockReturnValueOnce(pendingSummaryInstall.promise);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));
      const resetedRollupTransformId = getSLOTransformId(slo.id, slo.revision + 1);

      const assertion = expect(resetSLO.execute(slo.id)).rejects.toThrow('Transform install error');
      await jest.advanceTimersByTimeAsync(0);

      expect(mockScopedClusterClient.asCurrentUser.delete).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).not.toHaveBeenCalledWith(
        resetedRollupTransformId,
        expect.anything()
      );

      pendingSummaryInstall.resolve(getSLOSummaryTransformId(slo.id, slo.revision + 1));
      await assertion;

      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: SUMMARY_TEMP_INDEX_NAME }),
        expect.objectContaining({ ignore: [404] })
      );
      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(resetedRollupTransformId, {
        signal: expect.any(AbortSignal),
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws SLOOperationTimeout and rolls back when the deadline is exceeded', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockTransformManager.install.mockImplementationOnce(
        (_slo, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new errors.RequestAbortedError('Request aborted'))
            );
          })
      );
      const resetedRollupTransformId = getSLOTransformId(slo.id, slo.revision + 1);
      const resetedSummaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision + 1);

      const assertion = expect(resetSLO.execute(slo.id)).rejects.toBeInstanceOf(
        SLOOperationTimeout
      );
      await jest.advanceTimersByTimeAsync(REQUEST_DEADLINE_MS);
      await assertion;

      expect(mockTransformManager.start).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(
        resetedRollupTransformId,
        expect.anything()
      );
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(
        resetedSummaryTransformId,
        expect.anything()
      );
      expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws SLOOperationTimeout without installing when the deadline is exceeded while deleting the original resources', async () => {
      const slo = createSLO({ id: 'irrelevant', version: 1 });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockTransformManager.uninstall.mockImplementationOnce(
        (_transformId, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new errors.RequestAbortedError('Request aborted'))
            );
          })
      );

      const assertion = expect(resetSLO.execute(slo.id)).rejects.toBeInstanceOf(
        SLOOperationTimeout
      );
      await jest.advanceTimersByTimeAsync(REQUEST_DEADLINE_MS);
      await assertion;

      expect(mockTransformManager.install).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  function expectDeletionOfOriginalSLOResources(originalSlo: SLODefinition) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    const summaryTransformId = getSLOSummaryTransformId(originalSlo.id, originalSlo.revision);

    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(transformId, {
      signal: expect.any(AbortSignal),
    });
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId, {
      signal: expect.any(AbortSignal),
    });

    // rollup and summary pipelines using wildcard pipeline
    expect(
      mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
    ).toHaveBeenNthCalledWith(
      1,
      { id: getWildcardPipelineId(originalSlo.id, originalSlo.revision) },
      { ignore: [404], signal: expect.any(AbortSignal) }
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
