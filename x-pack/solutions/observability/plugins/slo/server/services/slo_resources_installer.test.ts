/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import {
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { SecurityException, SLOOperationTimeout } from '../errors';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { createSummaryTransformManagerMock, createTransformManagerMock } from './mocks';
import { SLOResourcesInstaller } from './slo_resources_installer';
import type { TransformManager } from './transform_manager';

describe('SLOResourcesInstaller', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockLogger: jest.Mocked<MockedLogger>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let installer: SLOResourcesInstaller;

  const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
  const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
  const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);

  const createSignal = () => new AbortController().signal;

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockLogger = loggingSystemMock.createLogger();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    installer = new SLOResourcesInstaller(
      mockScopedClusterClient,
      mockTransformManager,
      mockSummaryTransformManager,
      mockLogger,
      'some-space',
      httpServiceMock.createStartContract().basePath
    );
  });

  it('installs the pipelines, transforms and temporary document, then starts the transforms', async () => {
    const signal = createSignal();

    await installer.install(slo, { signal, operation: 'create' });

    expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline).toHaveBeenCalledTimes(2);
    expect(mockTransformManager.install).toHaveBeenCalledWith(slo, { signal });
    expect(mockSummaryTransformManager.install).toHaveBeenCalledWith(slo, { signal });
    expect(mockScopedClusterClient.asCurrentUser.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: SUMMARY_TEMP_INDEX_NAME, id: `slo-${slo.id}` }),
      { signal }
    );
    expect(mockTransformManager.start).toHaveBeenCalledWith(rollupTransformId, { signal });
    expect(mockSummaryTransformManager.start).toHaveBeenCalledWith(summaryTransformId, { signal });
    expect(mockTransformManager.uninstall).not.toHaveBeenCalled();
  });

  it('waits for every in-flight operation before rolling back', async () => {
    let resolveRollupInstall: (transformId: string) => void = () => {};
    mockTransformManager.install.mockReturnValue(
      new Promise((resolve) => {
        resolveRollupInstall = resolve;
      })
    );
    mockSummaryTransformManager.install.mockRejectedValue(new Error('summary install failed'));

    const installPromise = installer.install(slo, { signal: createSignal(), operation: 'create' });
    await new Promise(process.nextTick);

    expect(mockTransformManager.uninstall).not.toHaveBeenCalled();
    expect(mockSummaryTransformManager.uninstall).not.toHaveBeenCalled();

    resolveRollupInstall(rollupTransformId);

    await expect(installPromise).rejects.toThrow('summary install failed');
    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(rollupTransformId, {
      signal: expect.any(AbortSignal),
    });
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId, {
      signal: expect.any(AbortSignal),
    });
  });

  it('does not start the transforms when an install operation fails', async () => {
    mockTransformManager.install.mockRejectedValue(new Error('rollup install failed'));

    await expect(
      installer.install(slo, { signal: createSignal(), operation: 'create' })
    ).rejects.toThrow('rollup install failed');

    expect(mockTransformManager.start).not.toHaveBeenCalled();
    expect(mockSummaryTransformManager.start).not.toHaveBeenCalled();
  });

  it('rolls back every resource in stages when a transform fails to start', async () => {
    const calls: string[] = [];
    mockSummaryTransformManager.start.mockRejectedValue(new Error('summary start failed'));
    mockTransformManager.uninstall.mockImplementation(async () => {
      calls.push('uninstall rollup transform');
    });
    mockSummaryTransformManager.uninstall.mockImplementation(async () => {
      calls.push('uninstall summary transform');
    });
    mockScopedClusterClient.asCurrentUser.delete.mockImplementation(async () => {
      calls.push('delete temp doc');
      return {
        _id: '',
        _index: '',
        _version: 1,
        result: 'deleted',
        _shards: { total: 1, successful: 1, failed: 0 },
      };
    });
    mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline.mockImplementation(
      async ({ id }) => {
        calls.push(`delete pipeline ${id}`);
        return { acknowledged: true };
      }
    );
    const finalRollback = jest.fn(async () => {
      calls.push('final rollback');
    });

    await expect(
      installer.install(slo, { signal: createSignal(), operation: 'create', finalRollback })
    ).rejects.toThrow('summary start failed');

    expect(calls.slice(0, 3).sort()).toEqual([
      'delete temp doc',
      'uninstall rollup transform',
      'uninstall summary transform',
    ]);
    expect(calls.slice(3, 5).sort()).toEqual([
      `delete pipeline ${getSLOPipelineId(slo.id, slo.revision)}`,
      `delete pipeline ${getSLOSummaryPipelineId(slo.id, slo.revision)}`,
    ]);
    expect(calls[5]).toBe('final rollback');
  });

  it('ignores a missing temporary document during rollback', async () => {
    mockTransformManager.install.mockRejectedValue(new Error('rollup install failed'));

    await expect(
      installer.install(slo, { signal: createSignal(), operation: 'create' })
    ).rejects.toThrow('rollup install failed');

    expect(mockScopedClusterClient.asCurrentUser.delete).toHaveBeenCalledWith(
      expect.objectContaining({ index: SUMMARY_TEMP_INDEX_NAME, id: `slo-${slo.id}` }),
      expect.objectContaining({ ignore: [404] })
    );
  });

  it('throws an SLOOperationTimeout and rolls back with a fresh signal when the deadline is exceeded', async () => {
    const controller = new AbortController();
    controller.abort(new SLOOperationTimeout('deadline exceeded'));

    await expect(
      installer.install(slo, { signal: controller.signal, operation: 'create' })
    ).rejects.toThrow(SLOOperationTimeout);

    const [, { signal: rollbackSignal } = { signal: undefined }] =
      mockTransformManager.uninstall.mock.calls[0];
    expect(rollbackSignal).toBeInstanceOf(AbortSignal);
    expect(rollbackSignal?.aborted).toBe(false);
  });

  it('throws a SecurityException when an operation fails with a security exception', async () => {
    mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline.mockRejectedValue({
      meta: { body: { error: { type: 'security_exception', reason: 'missing privileges' } } },
    });

    await expect(
      installer.install(slo, { signal: createSignal(), operation: 'create' })
    ).rejects.toThrow(new SecurityException('missing privileges'));
  });

  it('throws the original error when a rollback operation fails', async () => {
    mockTransformManager.install.mockRejectedValue(new Error('rollup install failed'));
    mockSummaryTransformManager.uninstall.mockRejectedValue(new Error('uninstall failed'));
    const finalRollback = jest.fn(async () => {});

    await expect(
      installer.install(slo, { signal: createSignal(), operation: 'create', finalRollback })
    ).rejects.toThrow('rollup install failed');

    expect(finalRollback).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rollback operation failed.',
      expect.objectContaining({ error: new Error('uninstall failed') })
    );
  });
});
