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

  it('keeps an unexpected probe failure visible as a structured error with the source context and reports unknown', async () => {
    const original = new TypeError('cluster unhealthy');
    original.stack = 'TypeError: cluster unhealthy\n    at probe';
    const hasMetricIndices = jest.fn().mockRejectedValue(original);

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    // An unexpected failure (for example an authorization error) is not a timeout, so it stays at
    // error level. It is passed as the Error itself (not a string with `{ error }` meta) so the
    // OTel appender keeps the `exception.type` / `exception.message` / `exception.stacktrace`
    // attributes, which it reads from the first Error argument. The message carries the source and
    // pattern so the context survives Kibana's default console layout, while the original name and
    // stack are preserved so the exception type and stacktrace stay faithful to the real failure.
    expect(logger.error).toHaveBeenCalledTimes(1);
    const loggedError = logger.error.mock.calls[0][0] as Error;
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe(
      'Metric index status check failed for source "default" (pattern: metrics-*,metricbeat-*): cluster unhealthy'
    );
    expect(loggedError.name).toBe('TypeError');
    expect(loggedError.stack).toBe(original.stack);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats a cancelled probe as unknown without logging it as an error', async () => {
    const hasMetricIndices = jest
      .fn()
      .mockRejectedValue(new errors.RequestAbortedError('Request aborted'));

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    // A client disconnect aborts the probe; that is a cancelled check, not an infrastructure
    // failure, so it must stay out of the error (and warn) logs.
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps a response-size overrun visible as an error even though it is a RequestAbortedError', async () => {
    // The ES client also throws RequestAbortedError when elasticsearch.maxResponseSize is
    // exceeded. The browser is still waiting for a result in that case, so it is a real failure
    // and must not be downgraded to a debug "cancelled" line.
    const error = new errors.RequestAbortedError(
      'The content length (12345) is bigger than the maximum allowed string (10000)'
    );
    const hasMetricIndices = jest.fn().mockRejectedValue(error);

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    const loggedError = logger.error.mock.calls[0][0] as Error;
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toContain('Metric index status check failed for source "default"');
    expect(loggedError.message).toContain(error.message);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('collapses line breaks in the request-controlled source id so it cannot forge log lines', async () => {
    const hasMetricIndices = jest
      .fn()
      .mockRejectedValue(new errors.TimeoutError('Request timed out'));

    await composeSourceStatus({
      logger,
      sourceStatus: { hasMetricIndices },
      requestContext,
      request,
      sourceId: 'default\nerror forged line',
      metricAlias,
    });

    const [message] = logger.warn.mock.calls[0];
    expect(message).not.toContain('\n');
    expect(message).toContain('default error forged line');
  });

  it('collapses line breaks in the request-controlled metric alias so it cannot forge log lines', async () => {
    const hasMetricIndices = jest
      .fn()
      .mockRejectedValue(new errors.RequestAbortedError('Request aborted'));

    await composeSourceStatus({
      logger,
      sourceStatus: { hasMetricIndices },
      requestContext,
      request,
      sourceId: 'default',
      metricAlias: 'metrics-*\nerror forged line',
    });

    const [message] = logger.debug.mock.calls[0];
    expect(message).not.toContain('\n');
    expect(message).toContain('metrics-* error forged line');
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
