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

// Mirrors how Kibana's `%message` pattern conversion renders a logged Error: when a stack is
// present it renders `error.stack` in place of `error.message`
// (src/core/packages/logging/common-internal/src/layouts/conversions/message.ts). We cannot import
// that Core-private conversion from a plugin test, so we replicate its rule here to assert the
// context survives in the rendered body rather than only in the mocked logger argument.
const renderMessage = (error: Error): string => error.stack ?? error.message;

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
    // attributes, which it reads from the first Error argument.
    expect(logger.error).toHaveBeenCalledTimes(1);
    const loggedError = logger.error.mock.calls[0][0] as Error;
    expect(loggedError).toBeInstanceOf(Error);
    const expectedMessage =
      'Metric index status check failed for source "default" (pattern: metrics-*,metricbeat-*): cluster unhealthy';
    expect(loggedError.message).toBe(expectedMessage);
    expect(loggedError.name).toBe('TypeError');
    // Kibana's `%message` conversion renders `error.stack` (not `error.message`) when a stack is
    // present, so assert against that rendered body: the header carries the source and pattern
    // context, and the original frames are preserved after it.
    expect(renderMessage(loggedError)).toBe(`TypeError: ${expectedMessage}\n    at probe`);
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

  it('replaces the whole multiline error header so the diagnostic detail is not printed twice', async () => {
    // An Elasticsearch `ResponseError` message spans several lines: the error type followed by
    // `Caused by` / `Root causes` sections. The stack header is `name: message`, so those extra
    // message lines sit between the header's first line and the stack frames.
    const original = new Error(
      'illegal_argument_exception\n\tCaused by:\n\t\tillegal_state_exception: broken'
    );
    original.name = 'ResponseError';
    original.stack = `${original.name}: ${original.message}\n    at probe`;
    const hasMetricIndices = jest.fn().mockRejectedValue(original);

    await compose(hasMetricIndices);

    const loggedError = logger.error.mock.calls[0][0] as Error;
    const expectedMessage =
      'Metric index status check failed for source "default" (pattern: metrics-*,metricbeat-*): illegal_argument_exception\n\tCaused by:\n\t\tillegal_state_exception: broken';
    // The enriched header carries the full original message once, followed by the original frames
    // only — the `Caused by` block must not be repeated after the frames.
    expect(renderMessage(loggedError)).toBe(`ResponseError: ${expectedMessage}\n    at probe`);
  });

  it('still logs and reports unknown when the error carries a non-string stack', async () => {
    // Kibana's logging code supports Elasticsearch client errors whose `stack` is not a string.
    // The failure branch must not throw a TypeError trying to manipulate it, otherwise the catch
    // block crashes and the GET returns a 500 instead of `metricIndicesStatus: 'unknown'`.
    const original = new Error('cluster unhealthy');
    // Cast through unknown because the Error type declares `stack?: string`.
    (original as unknown as { stack: unknown }).stack = { not: 'a string' };
    const hasMetricIndices = jest.fn().mockRejectedValue(original);

    await expect(compose(hasMetricIndices)).resolves.toEqual({
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    const loggedError = logger.error.mock.calls[0][0] as Error;
    expect(loggedError.message).toBe(
      'Metric index status check failed for source "default" (pattern: metrics-*,metricbeat-*): cluster unhealthy'
    );
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
