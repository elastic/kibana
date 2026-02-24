/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  AT_TIMESTAMP,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  EVENT_OUTCOME,
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  URL_FULL,
} from '@kbn/apm-types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../../types';
import { getToolHandler as getTraces } from '../../../tools/get_traces/handler';
import { getObservabilityDataSources } from '../../../utils/get_observability_data_sources';

const ERROR_INSIGHT_TRACE_FIELDS = [
  AT_TIMESTAMP,
  SERVICE_NAME,
  SPAN_ID,
  PARENT_ID,
  SPAN_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DURATION,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  EVENT_OUTCOME,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  HTTP_RESPONSE_STATUS_CODE,
  HTTP_REQUEST_METHOD,
  URL_FULL,
];
import { getApmIndices } from '../../../utils/get_apm_indices';
import { parseDatemath } from '../../../utils/time';
import { getServiceTopology } from '../../../tools/get_service_topology/get_service_topology';
import { getTraceDocuments } from '../../../tools/get_traces/get_trace_documents';

export interface FetchApmErrorContextParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  errorId: string;
  start: string;
  end: string;
  serviceName: string;
  environment?: string;
  logger: Logger;
}

interface ContextPart {
  name: string;
  start: string;
  end: string;
  handler: () => Promise<unknown>;
}

export async function fetchApmErrorContext({
  core,
  plugins,
  dataRegistry,
  request,
  errorId,
  serviceName,
  start,
  end,
  environment = '',
  logger,
}: FetchApmErrorContextParams): Promise<string> {
  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client.asScoped(request);

  const errorDetails = await dataRegistry.getData('apmErrorDetails', {
    request,
    errorId,
    serviceName,
    start,
    end,
    serviceEnvironment: environment ?? '',
  });

  const traceId = errorDetails?.transaction?.trace?.id ?? errorDetails?.error?.trace?.id;

  const contextParts: ContextPart[] = [
    {
      name: 'ErrorDetails',
      start,
      end,
      handler: async () => errorDetails?.error,
    },
    {
      name: 'TransactionDetails',
      start,
      end,
      handler: async () => errorDetails?.transaction,
    },
    {
      name: 'DownstreamDependencies',
      start,
      end,
      handler: () =>
        getServiceTopology({
          core,
          plugins,
          dataRegistry,
          request,
          logger,
          serviceName,
          direction: 'downstream',
          start,
          end,
        }),
    },
  ];

  if (traceId) {
    const dataSources = await getObservabilityDataSources({ core, plugins, logger });
    const apmIndices = [
      dataSources.apmIndexPatterns.transaction,
      dataSources.apmIndexPatterns.span,
      dataSources.apmIndexPatterns.error,
    ].join(',');
    const traceContextPromise = (async () => {
      const apmIndices = await getApmIndices({ core, plugins, logger });
      return getTraceDocuments({
        esClient,
        traceIds: [traceId],
        index: [apmIndices.transaction, apmIndices.span, apmIndices.error].flatMap((pattern) =>
          pattern.split(',')
        ),
        size: 100,
        startTime: parsedStart,
        endTime: parsedEnd,
      });
    })();

    contextParts.push({
      name: 'TraceDocuments',
      start,
      end,
      handler: async () => {
        const result = await getTraces({
          core,
          plugins,
          logger,
          esClient,
          start,
          end,
          index: apmIndices,
          kqlFilter: `trace.id: "${traceId}"`,
          fields: ERROR_INSIGHT_TRACE_FIELDS,
          maxTraces: 1,
        });
        const trace = result.traces[0];
        if (!trace || trace.items.length === 0) {
          return undefined;
        }
        return {
          documents: trace.items,
          isTruncated: trace.isTruncated,
        };
      },
    });
        const [trace] = await traceContextPromise;
        return {
          isPartialTrace: trace.isTruncated,
          documents: trace.items,
        };
      },
    });

    contextParts.push({
      name: 'TraceServices',
      start,
      end,
      handler: async () => {
        const [trace] = await traceContextPromise;
        return trace.services;
      },
    });
  }

  const results = await Promise.all(
    contextParts.map(async ({ name, handler, start: partStart, end: partEnd }) => {
      try {
        const data = await handler();
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return undefined;
        }

        return dedent`<${name}>
          Time window: ${partStart} to ${partEnd}
          \`\`\`json
          ${JSON.stringify(data, null, 2)}
          \`\`\`
          </${name}>`;
      } catch (err) {
        logger.debug(`Error AI Insight: ${name} failed: ${err}`);
        return undefined;
      }
    })
  );

  return results.filter(Boolean).join('\n\n');
}
