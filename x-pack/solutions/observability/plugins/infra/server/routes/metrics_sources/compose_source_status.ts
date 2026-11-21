/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { MetricsSourceStatus } from '../../../common/metrics_sources';
import type { InfraSourceStatus } from '../../lib/source_status';
import { NoSuchRemoteClusterError } from '../../lib/sources/errors';
import type { InfraPluginRequestHandlerContext } from '../../types';

export const defaultSourceStatus: MetricsSourceStatus = {
  metricIndicesExist: false,
  remoteClustersExist: false,
  metricIndicesStatus: 'unknown',
};

/**
 * Collapses line breaks so a request-controlled value cannot forge additional log lines when
 * interpolated into a single-line log message.
 */
const toSingleLine = (value: string): string => value.replace(/[\r\n]+/g, ' ');

interface ComposeSourceStatusParams {
  logger: Logger;
  sourceStatus: Pick<InfraSourceStatus, 'hasMetricIndices'>;
  requestContext: InfraPluginRequestHandlerContext;
  request: KibanaRequest;
  sourceId: string;
  metricAlias: string;
}

/**
 * Probes whether the metric indices exist. A probe that fails or times out is reported as
 * `metricIndicesStatus: 'unknown'` rather than as missing indices.
 */
export const composeSourceStatus = async ({
  logger,
  sourceStatus,
  requestContext,
  request,
  sourceId,
  metricAlias,
}: ComposeSourceStatusParams): Promise<MetricsSourceStatus> => {
  try {
    const hasMetricIndices = await sourceStatus.hasMetricIndices(
      requestContext,
      metricAlias,
      request
    );
    return {
      metricIndicesExist: hasMetricIndices,
      remoteClustersExist: true,
      metricIndicesStatus: hasMetricIndices ? 'available' : 'missing',
    };
  } catch (err) {
    if (err instanceof NoSuchRemoteClusterError) {
      logger.error(err);
      return defaultSourceStatus;
    }

    if (err instanceof errors.TimeoutError) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Metric index status check timed out for source "${toSingleLine(
          sourceId
        )}" (pattern: ${metricAlias}): ${reason}`
      );
    } else {
      // Any other failure is unexpected (for example an authorization error), so keep it
      // visible as a structured error with its type and stack rather than downgrading it.
      logger.error(err instanceof Error ? err : new Error(String(err)));
    }

    return {
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    };
  }
};
