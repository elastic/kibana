/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { getSLOSummaryTransformId } from '../../common/constants';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { DefaultSummaryTransformManager } from './summay_transform_manager';

describe('SummaryTransformManager', () => {
  let scopedClusterClientMock: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;

  const alreadyExistsError = new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 409,
      body: { error: { type: 'resource_already_exists_exception' } },
    })
  );

  const createManager = (signal?: AbortSignal) =>
    new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(false),
      scopedClusterClientMock,
      loggerMock,
      { signal, retryOptions: { maxRetries: 1, initialDelayMs: 0, maxDelayMs: 0 } }
    );

  beforeEach(() => {
    scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Install', () => {
    it('installs the summary transform', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await createManager().install(slo);

      expect(transformId).toBe(getSLOSummaryTransformId(slo.id, slo.revision));
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(1);
    });

    it('resolves when a retried put returns already exists', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(alreadyExistsError);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await createManager().install(slo);

      expect(transformId).toBe(getSLOSummaryTransformId(slo.id, slo.revision));
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(2);
    });

    it('rejects when the first put returns already exists', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform.mockRejectedValueOnce(
        alreadyExistsError
      );
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createManager().install(slo)).rejects.toThrow(alreadyExistsError);
    });
  });

  describe('Signal', () => {
    it('forwards the per-call signal to install, start and uninstall', async () => {
      const { signal } = new AbortController();
      const transformManager = createManager();
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await transformManager.install(slo, { signal });
      await transformManager.start('slo-summary-transform-id', { signal });
      await transformManager.uninstall('slo-summary-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledWith(expect.anything(), { signal });
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.startTransform
      ).toHaveBeenCalledWith(expect.anything(), { ignore: [409], signal });
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledWith(expect.anything(), { ignore: [404], signal });
    });

    it('falls back to the constructor signal when no per-call signal is given', async () => {
      const { signal } = new AbortController();

      await createManager(signal).uninstall('slo-summary-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledWith(expect.anything(), { ignore: [404], signal });
    });
  });
});
