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
import { DefaultSummaryTransformManager } from './summay_transform_manager';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';

describe('SummaryTransformManager', () => {
  let scopedClusterClientMock: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;

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

  const createManager = () =>
    new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(false),
      scopedClusterClientMock,
      loggerMock
    );

  describe('Install', () => {
    it('succeeds when a retry finds the transform created by a timed out attempt', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(alreadyExistsError);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createManager().install(slo)).resolves.toBe(
        getSLOSummaryTransformId(slo.id, slo.revision)
      );
      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(2);
    });
  });
});
