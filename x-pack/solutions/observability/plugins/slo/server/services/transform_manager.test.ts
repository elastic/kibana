/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

jest.mock('timers/promises');
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { REQUEST_RETRY_OPTIONS } from '../utils/retry';
import { DefaultTransformManager } from './transform_manager';
import type { TransformManagerOptions } from './transform_manager';
import {
  ApmTransactionErrorRateTransformGenerator,
  TransformGenerator,
} from './transform_generators';
import { createTransformGenerators } from './transform_generators/transform_generators_factory';
import type { SLODefinition, IndicatorTypes } from '../domain/models';
import {
  createAPMTransactionDurationIndicator,
  createAPMTransactionErrorRateIndicator,
  createSLO,
} from './fixtures/slo';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import type { DataViewsService } from '@kbn/data-views-plugin/common';

describe('TransformManager', () => {
  let scopedClusterClientMock: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  const spaceId = 'default';
  const { signal } = new AbortController();

  beforeEach(() => {
    scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Install', () => {
    describe('Unhappy path', () => {
      it('throws when no generator exists for the slo indicator type', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'sli.apm.transactionDuration': new DummyTransformGenerator(spaceId, dataViewsService),
        };
        const service = new DefaultTransformManager(
          generators,
          scopedClusterClientMock,
          loggerMock
        );

        await expect(
          service.install(createSLO({ indicator: createAPMTransactionErrorRateIndicator() }), {
            signal,
          })
        ).rejects.toThrow('Unsupported indicator type [sli.apm.transactionErrorRate]');
      });

      it('throws when transform generator fails', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'sli.apm.transactionDuration': new FailTransformGenerator(spaceId, dataViewsService),
        };
        const transformManager = new DefaultTransformManager(
          generators,
          scopedClusterClientMock,
          loggerMock
        );

        await expect(
          transformManager.install(
            createSLO({ indicator: createAPMTransactionDurationIndicator() }),
            { signal }
          )
        ).rejects.toThrow('Some error');
      });
    });

    it('installs the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await transformManager.install(slo, { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(1);
      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
    });
  });

  describe('Install idempotency', () => {
    const alreadyExistsError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: {
          error: {
            type: 'resource_already_exists_exception',
            reason: 'Transform with id [slo-id-1] already exists',
          },
        },
      })
    );
    const createManager = () =>
      new DefaultTransformManager(
        createTransformGenerators(spaceId, dataViewsService, false),
        scopedClusterClientMock,
        loggerMock
      );

    it('succeeds when a retry finds the transform created by a timed out attempt', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(alreadyExistsError);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createManager().install(slo, { signal })).resolves.toBe(
        `slo-${slo.id}-${slo.revision}`
      );
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(2);
    });

    it('fails when the transform already exists on the first attempt', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform.mockRejectedValueOnce(
        alreadyExistsError
      );
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createManager().install(slo, { signal })).rejects.toBe(alreadyExistsError);
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  const createDefaultManager = (options?: TransformManagerOptions) =>
    new DefaultTransformManager(
      createTransformGenerators(spaceId, dataViewsService, false),
      scopedClusterClientMock,
      loggerMock,
      options
    );

  describe('Abort signal', () => {
    const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

    it('forwards the call signal to putTransform', async () => {
      const controller = new AbortController();

      await createDefaultManager().install(slo, { signal: controller.signal });

      const [[, options]] =
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform.mock.calls;
      expect(options?.signal).toBe(controller.signal);
    });

    it('forwards the call signal to scheduleNowTransform', async () => {
      const controller = new AbortController();

      await createDefaultManager().start('slo-transform-id', { signal: controller.signal });

      const [[, options]] =
        scopedClusterClientMock.asSecondaryAuthUser.transform.scheduleNowTransform.mock.calls;
      expect(options?.signal).toBe(controller.signal);
    });

    it.each([
      ['start', 'startTransform'],
      ['stop', 'stopTransform'],
      ['uninstall', 'deleteTransform'],
      ['preview', 'previewTransform'],
    ] as const)('forwards the call signal from %s to %s', async (method, esMethod) => {
      await createDefaultManager()[method]('slo-transform-id', { signal });

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

      await createDefaultManager().getVersion('slo-transform-id', { signal: controller.signal });

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
        createDefaultManager({ retryOptions: REQUEST_RETRY_OPTIONS }).uninstall(
          'slo-transform-id',
          { signal }
        )
      ).rejects.toThrow('irrelevant');
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('Preview', () => {
    it('previews the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      await transformManager.preview('slo-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.previewTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Start', () => {
    it('starts the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      await transformManager.start('slo-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.startTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stop', () => {
    it('stops the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      await transformManager.stop('slo-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.stopTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Uninstall', () => {
    it('uninstalls the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      await transformManager.uninstall('slo-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(1);
    });

    it('retries on transient error', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform.mockRejectedValueOnce(
        new EsErrors.ConnectionError('irrelevant')
      );
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      await transformManager.uninstall('slo-transform-id', { signal });

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('GetVersion', () => {
    it('handles inexistant transforms', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      scopedClusterClientMock.asSecondaryAuthUser.transform.getTransform.mockRejectedValue({
        meta: { body: { error: { type: 'resource_not_found_exception' } } },
      });

      const version = await transformManager.getVersion('inexistant', { signal });

      expect(version).toBe(undefined);
    });

    it('handles transform without meta version', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      scopedClusterClientMock.asSecondaryAuthUser.transform.getTransform.mockResolvedValue({
        count: 1,
        transforms: [
          {
            dest: { index: 'irrelevant' },
            source: { index: 'irrelevant' },
            id: 'slo-id-1',
            // No _meta version
            _meta: {
              other: 'field',
            },
          },
        ],
      });

      const version = await transformManager.getVersion('slo-id-1', { signal });

      expect(version).toBe(undefined);
    });

    it('handles transform with version specified', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(
          spaceId,
          dataViewsService,
          false
        ),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock
      );

      scopedClusterClientMock.asSecondaryAuthUser.transform.getTransform.mockResolvedValue({
        count: 1,
        transforms: [
          {
            dest: { index: 'irrelevant' },
            source: { index: 'irrelevant' },
            id: 'slo-id-1',
            // No _meta version
            _meta: {
              version: 3.4,
            },
          },
        ],
      });

      const version = await transformManager.getVersion('slo-id-1', { signal });

      expect(version).toBe(3.4);
    });
  });
});

class DummyTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService) {
    super(spaceId, dataViewService);
  }
  async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    return {} as TransformPutTransformRequest;
  }
}

class FailTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService) {
    super(spaceId, dataViewService);
  }

  getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    throw new Error('Some error');
  }
}
