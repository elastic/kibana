/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { NoSuchRemoteClusterError } from '../../lib/sources/errors';
import { handleSourceStatusError } from './handle_source_status_error';

const createLogger = () =>
  ({ warn: jest.fn(), error: jest.fn() } as unknown as Logger & {
    warn: jest.Mock;
    error: jest.Mock;
  });

describe('handleSourceStatusError', () => {
  let logger: Logger & { warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    logger = createLogger();
  });

  it('logs a timed-out probe at warn with the source context, not error', () => {
    const err = new Error('Request timed out');
    err.name = 'TimeoutError';

    const status = handleSourceStatusError(logger, 'default', err);

    // A timeout is a probe that never completed, not a confirmed "no indices".
    // Logging it at warn (with context) keeps it out of the shared, context-free
    // `Request timed out` error bucket this issue was carved from.
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [message] = logger.warn.mock.calls[0];
    expect(message).toContain('default');
    expect(message).toContain('Request timed out');

    // Behaviour on the response is unchanged: still reports the indices as
    // absent so no contract consumer breaks.
    expect(status).toEqual({ metricIndicesExist: false, remoteClustersExist: true });
  });

  it('keeps the error-level log and missing-cluster status for a missing remote cluster', () => {
    const err = new NoSuchRemoteClusterError();

    const status = handleSourceStatusError(logger, 'default', err);

    // A missing remote cluster is a genuine configuration answer and must stay
    // visible at error level with its dedicated callout status.
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(status).toEqual({ metricIndicesExist: false, remoteClustersExist: false });
  });
});
