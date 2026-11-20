/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { NoSuchRemoteClusterError } from '../../lib/sources/errors';
import { composeSourceStatus } from './compose_source_status';

const metricAlias = 'metrics-*,metricbeat-*';

describe('composeSourceStatus', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  const requestContext = {} as InfraPluginRequestHandlerContext;

  const compose = (hasMetricIndices: jest.Mock) =>
    composeSourceStatus({
      logger,
      sourceStatus: { hasMetricIndices },
      requestContext,
      request,
      sourceId: 'default',
      metricAlias,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports available indices', async () => {
    const hasMetricIndices = jest.fn().mockResolvedValue(true);

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: true,
      remoteClustersExist: true,
      metricIndicesStatus: 'available',
    });
    expect(hasMetricIndices).toHaveBeenCalledWith(requestContext, metricAlias, request);
  });

  it('reports missing indices when the probe completes without a match', async () => {
    await expect(compose(jest.fn().mockResolvedValue(false))).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'missing',
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports an unknown status and warns with the source and pattern when the probe times out', async () => {
    const hasMetricIndices = jest
      .fn()
      .mockRejectedValue(new errors.TimeoutError('Request timed out'));

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Metric index status check timed out for source "default" (pattern: metrics-*,metricbeat-*): Request timed out'
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports an unknown status when the probe fails for another reason', async () => {
    const hasMetricIndices = jest.fn().mockRejectedValue(new Error('cluster unhealthy'));

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Metric index status check failed for source "default" (pattern: metrics-*,metricbeat-*): cluster unhealthy'
    );
  });

  it('keeps the error log and reports missing remote clusters when the remote cluster does not exist', async () => {
    const error = new NoSuchRemoteClusterError('no such remote cluster');
    const hasMetricIndices = jest.fn().mockRejectedValue(error);

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: false,
      metricIndicesStatus: 'unknown',
    });
    expect(logger.error).toHaveBeenCalledWith(error);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
