/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core/server';
import { termFilter } from '../../../utils/dsl_filters';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../../types';
import { getFilteredLogCategories } from '../../../tools/get_log_categories/handler';
import { getLogsIndices } from '../../../utils/get_logs_indices';
import { getApmIndices } from '../../../utils/get_apm_indices';
import { parseDatemath } from '../../../utils/time';
import { fetchDistributedTrace } from './fetch_distributed_trace';

export interface FetchApmErrorContextParams {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
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
  const parsedStart = parseDatemath(start);
  const parsedEnd = parseDatemath(end, { roundUp: true });

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
        dataRegistry.getData('apmDownstreamDependencies', {
          request,
          serviceName,
          serviceEnvironment: environment ?? '',
          start,
          end,
        }),
    },
  ];

  if (traceId) {
    const traceContextPromise = (async () => {
      const apmIndices = await getApmIndices({ core, plugins, logger });
      return fetchDistributedTrace({
        esClient,
        apmIndices,
        traceId,
        start: parsedStart,
        end: parsedEnd,
        logger,
      });
    })();

    contextParts.push({
      name: 'TraceDocuments',
      start,
      end,
      handler: async () => {
        const { traceDocuments, isPartialTrace } = await traceContextPromise;
        return {
          isPartialTrace,
          documents: traceDocuments,
        };
      },
    });

    contextParts.push({
      name: 'TraceServices',
      start,
      end,
      handler: async () => (await traceContextPromise).services,
    });

    contextParts.push({
      name: 'TraceLogCategories',
      start,
      end,
      handler: async () => {
        const logsIndices = await getLogsIndices({ core, logger });

        const logCategories = await getFilteredLogCategories({
          esClient,
          logsIndices,
          boolQuery: {
            filter: [
              ...termFilter('trace.id', traceId),
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
          fields: ['trace.id'],
        });

        return logCategories?.categories;
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
