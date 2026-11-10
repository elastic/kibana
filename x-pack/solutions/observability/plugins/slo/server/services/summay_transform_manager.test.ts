/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getSLOSummaryTransformId } from '../../common/constants';
import { REQUEST_RETRY_OPTIONS } from '../utils/retry';
import { DefaultSummaryTransformManager } from './summay_transform_manager';
import type { TransformManagerOptions } from './transform_manager';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';

describe('SummaryTransformManager', () => {
  let scopedClusterClientMock: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  const { signal } = new AbortController();

  const alreadyExistsError = new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 400,
      body: {
        error: {
          type: 'resource_already_exists_exception',
          reason: 'Transform with id [slo-summary-id-1] already exists',
        },
      },
    })
  );

  beforeEach(() => {
    scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  const createManager = (options?: TransformManagerOptions) =>
    new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(false),
      scopedClusterClientMock,
      loggerMock,
      options
    );

  describe('Install', () => {
    it('succeeds when a retry finds the transform created by a timed out attempt', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(alreadyExistsError);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createManager().install(slo, { signal })).resolves.toBe(
        getSLOSummaryTransformId(slo.id, slo.revision)
      );
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('Abort signal', () => {
    const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

    it('forwards the call signal to putTransform', async () => {
      const controller = new AbortController();

      await createManager().install(slo, { signal: controller.signal });

      const [[, options]] =
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform.mock.calls;
      expect(options?.signal).toBe(controller.signal);
    });

    it.each([
      ['start', 'startTransform'],
      ['stop', 'stopTransform'],
      ['uninstall', 'deleteTransform'],
      ['preview', 'previewTransform'],
    ] as const)('forwards the call signal from %s to %s', async (method, esMethod) => {
      await createManager()[method]('slo-summary-transform-id', { signal });

      const [[, options]] =
        scopedClusterClientMock.asSecondaryAuthUser.transform[esMethod].mock.calls;
      expect(options?.signal).toBe(signal);
    });

    it('forwards the call signal to getTransform', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.getTransform.mockResolvedValue({
        count: 0,
        transforms: [],
      });
      const controller = new AbortController();

      await createManager().getVersion('slo-summary-transform-id', { signal: controller.signal });

      const [[, options]] =
        scopedClusterClientMock.asSecondaryAuthUser.transform.getTransform.mock.calls;
      expect(options?.signal).toBe(controller.signal);
    });
  });

  describe('Retry options', () => {
    it('uses the retry options given to the constructor', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform.mockRejectedValue(
        new EsErrors.ConnectionError('irrelevant')
      );

      await expect(
        createManager({ retryOptions: REQUEST_RETRY_OPTIONS }).uninstall(
          'slo-summary-transform-id',
          { signal }
        )
      ).rejects.toThrow('irrelevant');
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(3);
    });
  });
});
