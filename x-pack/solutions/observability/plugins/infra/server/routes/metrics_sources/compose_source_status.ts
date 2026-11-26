/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
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
 * Strips control characters so a request-controlled value cannot forge additional log lines or
 * overwrite earlier text when interpolated into a single-line log message. This covers not only
 * CR/LF but also characters Kibana's plain-text logger passes straight through (for example
 * backspace), which could otherwise rewrite the rendered source or log prefix in a terminal.
 */
// eslint-disable-next-line no-control-regex
const toSingleLine = (value: string): string => value.replace(/[\u0000-\u001f\u007f]+/g, ' ');

/**
 * Wraps a probe failure in an `Error` whose message is prefixed with the source and pattern
 * context, so the log names which source is misconfigured rather than relying on the original
 * error's context-free message.
 */
const withSourceContext = (original: Error, context: string): Error => {
  const message = `${context}: ${original.message}`;
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
  return error;
};

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
    const context = `Metric index status check failed for source "${toSingleLine(
      sourceId
    )}" (pattern: ${toSingleLine(metricAlias)})`;

    if (err instanceof NoSuchRemoteClusterError) {
      // Keep the missing remote cluster at error level, but name the source and pattern so the
      // operator can tell which configuration is misconfigured rather than seeing only the
      // error's own context-free default message.
      logger.error(withSourceContext(err, context));
      return defaultSourceStatus;
    }

    if (err instanceof errors.RequestAbortedError && !isMaximumResponseSizeExceededError(err)) {
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
      logger.warn(
        `Metric index status check timed out for source "${toSingleLine(
          sourceId
        )}" (pattern: ${toSingleLine(metricAlias)}): ${toSingleLine(err.message)}`
      );
    } else {
      // Any other failure is unexpected (for example an authorization error), so keep it
      // visible at error level. Pass the Error itself as the first argument: the OTel appender
      // reads `exception.type` / `exception.message` / `exception.stacktrace` from
      // `LogRecord.error`, which is only populated from the first argument when it is an Error, so
      // passing it as `{ error }` meta would drop those attributes.
      const original = err instanceof Error ? err : new Error(String(err));
      logger.error(withSourceContext(original, context));
    }

    return {
      metricIndicesExist: false,
      remoteClustersExist: true,
      metricIndicesStatus: 'unknown',
    };
  }
};
