/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MetricsSourceStatus } from '../../../common/metrics_sources';
import { NoSuchRemoteClusterError } from '../../lib/sources/errors';

const missingRemoteClusterStatus: MetricsSourceStatus = {
  metricIndicesExist: false,
  remoteClustersExist: false,
};

const probeIncompleteStatus: MetricsSourceStatus = {
  metricIndicesExist: false,
  remoteClustersExist: true,
};

/**
 * Maps a failure of the metric-index status probe to a {@link MetricsSourceStatus}.
 *
 * A missing remote cluster is a genuine answer about the source configuration
 * and keeps its dedicated `error`-level log so the misconfiguration stays
 * visible. Every other failure — most commonly a transient
 * `TimeoutError: Request timed out` when the probe exceeds the transport
 * ceiling — is a probe that never completed rather than a confirmed "no
 * indices", so it is logged at `warn` with the index pattern instead of a
 * bare, context-free `error`. That keeps a slow cluster out of the shared,
 * cross-team `Request timed out` error bucket while still surfacing the signal.
 */
export const handleSourceStatusError = (
  logger: Logger,
  metricAlias: string,
  err: unknown
): MetricsSourceStatus => {
  if (err instanceof NoSuchRemoteClusterError) {
    logger.error(err);
    return missingRemoteClusterStatus;
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.warn(
    `Metric index status check did not complete for pattern "${metricAlias}": ${message}`
  );

  return probeIncompleteStatus;
};
