/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';

export interface FetchApmErrorContextParams {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  serviceName: string;
  environment?: string;
  start: string;
  end: string;
  errorId: string;
  logger: Logger;
}

export async function fetchApmErrorContext({
  dataRegistry,
  request,
  serviceName,
  environment = '',
  start,
  end,
  errorId,
  logger,
}: FetchApmErrorContextParams): Promise<string> {
  const contextParts: string[] = [];

  // Fetch the full error details with transaction (if available)
  const details = await dataRegistry.getData('apmErrorDetails', {
    request,
    errorId,
    serviceName,
    start,
    end,
    serviceEnvironment: environment ?? '',
  });

  contextParts.push(`<ErrorDetails>\n${JSON.stringify(details?.error, null, 2)}\n</ErrorDetails>`);

  if (details?.transaction) {
    contextParts.push(
      `<TransactionDetails>\n${JSON.stringify(
        details?.transaction,
        null,
        2
      )}\n</TransactionDetails>`
    );
  }

  try {
    // Fetch the downstream dependencies for the service related to the error
    const apmDownstreamDependencies = await dataRegistry.getData('apmDownstreamDependencies', {
      request,
      serviceName,
      serviceEnvironment: environment ?? '',
      start,
      end,
    });

    if (apmDownstreamDependencies?.length) {
      contextParts.push(
        `<APMDownstreamDependencies>\n${JSON.stringify(
          apmDownstreamDependencies,
          null,
          2
        )}\n</APMDownstreamDependencies>`
      );
    }
  } catch (error) {
    logger.debug(`Error AI insight: apmDownstreamDependencies failed: ${error}`);
  }

  const traceId = details?.error?.trace?.id;
  if (traceId) {
    try {
      // Fetch the trace details for the error (trace items, aggregated services for the trace, trace errors)
      const traces = await dataRegistry.getData('apmTraceDetails', {
        request,
        traceId,
        start,
        end,
      });

      if (traces?.traceItems?.length) {
        contextParts.push(
          `<TraceItems>\n${JSON.stringify(traces.traceItems.slice(0, 100), null, 2)}\n</TraceItems>`
        );
      }

      if (traces?.traceErrors?.length) {
        contextParts.push(
          `<TraceErrors>\n${JSON.stringify(
            traces.traceErrors.slice(0, 100),
            null,
            2
          )}\n</TraceErrors>`
        );
      }

      if (traces?.traceServiceAggregates?.length) {
        contextParts.push(
          `<TraceServices>\n${JSON.stringify(
            traces.traceServiceAggregates.slice(0, 25),
            null,
            2
          )}\n</TraceServices>`
        );
      }
    } catch (error) {
      logger.debug(`Error AI insight: apmTraces failed: ${error}`);
    }

    try {
      // Fetch categorized logs tied to this trace (trace.id or services in the trace)
      const logCategories = await dataRegistry.getData('apmLogCategoriesByTrace', {
        request,
        traceId,
        start,
        end,
      });

      if (logCategories?.length) {
        contextParts.push(
          `<TraceLogCategories>\n${JSON.stringify(
            logCategories.slice(0, 10),
            null,
            2
          )}\n</TraceLogCategories>`
        );
      }
    } catch (error) {
      logger.debug(`Error AI insight: apmLogCategoriesByTrace failed: ${error}`);
    }
  }

  return contextParts.filter(Boolean).join('\n\n');
}
