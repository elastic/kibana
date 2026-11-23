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

/**
 * The Elasticsearch client throws `RequestAbortedError` both when the caller actually cancels the
 * request and when `elasticsearch.maxResponseSize` / `maxCompressedResponseSize` is exceeded. Only
 * the first is a cancelled check; the response-size overrun is a real failure the caller is still
 * waiting on, so it carries a distinctive message we must not downgrade to debug.
 */
const isResponseSizeOverrun = (err: errors.RequestAbortedError): boolean =>
  err.message.includes('is bigger than the maximum allowed');

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

    if (err instanceof errors.RequestAbortedError && !isResponseSizeOverrun(err)) {
      // The client disconnected (for example the user navigated away) and the adapter aborted
      // the probe. That is a cancelled check, not an infrastructure failure, so it must not be
      // logged at error level. A response-size overrun also surfaces as a RequestAbortedError but
      // is a real failure, so it falls through to the error branch below.
      logger.debug(
        `Metric index status check was aborted for source "${toSingleLine(
          sourceId
        )}" (pattern: ${toSingleLine(metricAlias)})`
      );
    } else if (err instanceof errors.TimeoutError) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Metric index status check timed out for source "${toSingleLine(
          sourceId
        )}" (pattern: ${toSingleLine(metricAlias)}): ${reason}`
      );
    } else {
      // Any other failure is unexpected (for example an authorization error), so keep it
      // visible at error level. Pass the Error itself as the first argument: the OTel appender
      // reads `exception.type` / `exception.message` / `exception.stacktrace` from
      // `LogRecord.error`, which is only populated from the first argument when it is an Error, so
      // passing it as `{ error }` meta would drop those attributes.
      const original = err instanceof Error ? err : new Error(String(err));
      const message = `Metric index status check failed for source "${toSingleLine(
        sourceId
      )}" (pattern: ${toSingleLine(metricAlias)}): ${original.message}`;
      const error = new Error(message);
      error.name = original.name;
      // Kibana's `%message` pattern conversion renders `error.stack` in place of `error.message`
      // when a stack is present, so copying the original stack verbatim would hide the source and
      // pattern from the default console and OTel log body. Rewrite the stack's header (the
      // leading `name: message`) to carry the enriched message while keeping the original frames,
      // so the context survives in the rendered output and the stacktrace stays faithful.
      //
      // The header must be replaced as a whole: an Elasticsearch `ResponseError` message spans
      // several lines (`Caused by` / `Root causes`), so splitting on the first line break alone
      // would leave those lines in the frames and print the diagnostic detail twice.
      //
      // Only rewrite a string stack: Kibana's logging supports Elasticsearch client errors whose
      // `stack` is not a string, and manipulating a non-string stack here would throw and turn the
      // probe failure into a 500 instead of the `unknown` status.
      if (typeof original.stack === 'string') {
        const originalHeader = `${original.name}: ${original.message}`;
        error.stack = original.stack.startsWith(originalHeader)
          ? `${error.name}: ${message}${original.stack.slice(originalHeader.length)}`
          : `${error.name}: ${message}\n${original.stack}`;
      } else {
        // The original stack is not a string we can splice the enriched header into, and the
        // wrapper's own stack points at this helper rather than where the probe failed. Reporting
        // those frames would replace the original diagnostic with a misleading location, so drop
        // the stack entirely: `%message` then renders `error.message`, which already carries the
        // source, pattern and original message.
        error.stack = undefined;
      }
      logger.error(error);
    }

    return {
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    };
  }
};
