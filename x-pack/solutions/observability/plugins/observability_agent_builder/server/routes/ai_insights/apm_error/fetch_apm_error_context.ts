/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../../types';
import { getFilteredLogCategories } from '../../../tools/get_log_categories/get_log_categories';
import { getLogsIndices } from '../../../utils/get_logs_indices';
import { getApmIndices } from '../../../utils/get_apm_indices';
import { parseDatemath } from '../../../utils/time';
import { fetchTraceContext } from './fetch_trace_context';

export interface FetchApmErrorContextParams {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
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
  core,
  plugins,
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
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asScoped(request);
    const parsedStart = parseDatemath(start);
    const parsedEnd = parseDatemath(end, { roundUp: true });

    try {
      // Fetch the trace details for the error (trace items, aggregated services for the trace, trace errors)
      const apmIndices = await getApmIndices({ core, plugins, logger });
      const traceContext = await fetchTraceContext({
        esClient,
        apmIndices,
        traceId,
        start: parsedStart,
        end: parsedEnd,
        logger,
      });

      if (traceContext.traceItems.length) {
        contextParts.push(
          `<TraceItems>\n${JSON.stringify(traceContext.traceItems, null, 2)}\n</TraceItems>`
        );
      }

      if (traceContext.traceErrors.length) {
        contextParts.push(
          `<TraceErrors>\n${JSON.stringify(traceContext.traceErrors, null, 2)}\n</TraceErrors>`
        );
      }

      if (traceContext.traceServiceAggregates.length) {
        contextParts.push(
          `<TraceServices>\n${JSON.stringify(
            traceContext.traceServiceAggregates,
            null,
            2
          )}\n</TraceServices>`
        );
      }
    } catch (error) {
      logger.debug(`Error AI insight: Failed to fetch trace context for ${traceId}: ${error}`);
    }

    try {
      // Fetch log categories for the trace
      const logsIndices = await getLogsIndices({ core, logger });

      const logCategories = await getFilteredLogCategories({
        esClient,
        logsIndices,
        boolQuery: {
          filter: [
            { term: { 'trace.id': traceId } },
            { exists: { field: 'message' } },
            {
              range: {
                '@timestamp': {
                  gte: parsedStart,
                  lte: parsedEnd,
                },
              },
            },
          ],
        },
        logger,
        categoryCount: 10,
        terms: { 'trace.id': traceId },
      });

      if (logCategories?.categories?.length) {
        contextParts.push(
          `<TraceLogCategories>\n${JSON.stringify(logCategories, null, 2)}\n</TraceLogCategories>`
        );
      }
    } catch (error) {
      logger.debug(
        `Error AI insight: Failed to fetch log categories for trace ${traceId}: ${error}`
      );
    }
  }

  return contextParts.filter(Boolean).join('\n\n');
}
