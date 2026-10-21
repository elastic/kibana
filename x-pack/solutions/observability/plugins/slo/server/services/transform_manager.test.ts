/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { DefaultTransformManager } from './transform_manager';
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
          service.install(createSLO({ indicator: createAPMTransactionErrorRateIndicator() }))
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
            createSLO({ indicator: createAPMTransactionDurationIndicator() })
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

      const transformId = await transformManager.install(slo);

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(1);
      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
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

      await transformManager.preview('slo-transform-id');

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

      await transformManager.start('slo-transform-id');

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

      await transformManager.stop('slo-transform-id');

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

      await transformManager.uninstall('slo-transform-id');

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

      await transformManager.uninstall('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('Install idempotency', () => {
    const alreadyExistsError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 409,
        body: { error: { type: 'resource_already_exists_exception' } },
      })
    );

    const createManager = () =>
      new DefaultTransformManager(
        createTransformGenerators(spaceId, dataViewsService, false, false),
        scopedClusterClientMock,
        loggerMock,
        { retryOptions: { maxRetries: 1, initialDelayMs: 0, maxDelayMs: 0 } }
      );

    it('resolves when a retried put returns already exists', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(alreadyExistsError);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await createManager().install(slo);

      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
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
    const createManager = (signal?: AbortSignal) =>
      new DefaultTransformManager(
        createTransformGenerators(spaceId, dataViewsService, false, false),
        scopedClusterClientMock,
        loggerMock,
        { signal }
      );

    it('forwards the per-call signal to install, start and uninstall', async () => {
      const { signal } = new AbortController();
      const transformManager = createManager();
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await transformManager.install(slo, { signal });
      await transformManager.start('slo-transform-id', { signal });
      await transformManager.uninstall('slo-transform-id', { signal });

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
      const transformManager = createManager(signal);

      await transformManager.uninstall('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledWith(expect.anything(), { ignore: [404], signal });
    });

    it('does not call Elasticsearch when the per-call signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('deadline exceeded'));
      const transformManager = createManager();

      await expect(
        transformManager.uninstall('slo-transform-id', { signal: controller.signal })
      ).rejects.toThrow('deadline exceeded');
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).not.toHaveBeenCalled();
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

      const version = await transformManager.getVersion('inexistant');

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

      const version = await transformManager.getVersion('slo-id-1');

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

      const version = await transformManager.getVersion('slo-id-1');

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
