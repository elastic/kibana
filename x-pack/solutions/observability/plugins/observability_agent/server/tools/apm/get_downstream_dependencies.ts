/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import datemath from '@elastic/datemath';
import seedrandom from 'seedrandom';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { RUM_AGENT_NAMES } from '@kbn/elastic-agent-utils';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
  ObservabilityAgentPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { getTypedSearch } from '../../utils/get_typed_search';

export const OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID =
  'observability.get_apm_downstream_dependencies';

const downstreamDependenciesSchema = z.object({
  serviceName: z.string().min(1).describe('The name of the service'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
  start: z
    .string()
    .min(1)
    .describe('The start of the time range, in Elasticsearch date math, like `now`.')
    .default('now-24h'),
  end: z
    .string()
    .min(1)
    .describe('The end of the time range, in Elasticsearch date math, like `now`.')
    .default('now'),
});

export async function createObservabilityGetApmDownstreamDependenciesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const { apmIndexPatterns } = await getObservabilityDataSources({ core, plugins, logger });

  const toolDefinition: BuiltinToolDefinition<typeof downstreamDependenciesSchema> = {
    id: OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Get the downstream dependencies (services or uninstrumented backends) for a service, mapping span.destination.service.resource to service.name when possible.',
    schema: downstreamDependenciesSchema,
    tags: ['observability', 'apm', 'dependencies'],
    handler: async ({ serviceName, serviceEnvironment, start: startDm, end: endDm }, ctx) => {
      try {
        const { request, esClient } = ctx;
        const [coreStart] = await core.getStartServices();

        const username = coreStart.security?.authc.getCurrentUser(request)?.username;
        let seed = 1;
        if (username) {
          seed = Math.abs(seedrandom(username).int32());
        }

        const typedSearch = getTypedSearch(esClient.asCurrentUser);

        const start = datemath.parse(startDm)!.valueOf();
        const end = datemath.parse(endDm)!.valueOf();

        // Build common filters
        const envFilters = environmentQuery(serviceEnvironment ?? 'ENVIRONMENT_ALL');
        const baseFilters = [
          { exists: { field: 'span.destination.service.resource' } },
          { term: { 'service.name': serviceName } },
          ...envFilters,
          // Exclude RUM exit spans (high cardinality, not relevant for downstream DB calls)
          { bool: { must_not: [{ terms: { 'agent.name': RUM_AGENT_NAMES } }] } },
          { range: { '@timestamp': { gte: start, lte: end } } },
        ];

        const spanIndices = apmIndexPatterns.span ?? [];
        const transactionIndices = apmIndexPatterns.transaction ?? [];

        // If no APM span/transaction indices are configured, avoid a cluster-wide search
        if (spanIndices.length === 0 || transactionIndices.length === 0) {
          logger.debug(
            'observability.get_apm_downstream_dependencies: missing APM indices; returning empty result'
          );
          return {
            results: [
              {
                type: ToolResultType.other,
                data: { dependencies: [] },
              },
            ],
          };
        }

        // 1) Count documents to determine sampling probability
        const countResponse = await typedSearch({
          index: spanIndices,
          allow_no_indices: true,
          ignore_unavailable: true,
          size: 0,
          track_total_hits: true,
          query: { bool: { filter: baseFilters } },
        });

        const totalDocCount: number = countResponse.hits.total?.value ?? 0;
        const rawSamplingProbability = Math.min(10_000_000 / totalDocCount, 1);
        const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1;

        // 2) Sample exit spans and build spanId -> destination mapping
        const samplingResponse = await typedSearch({
          index: spanIndices,
          allow_no_indices: true,
          ignore_unavailable: true,
          size: 0,
          track_total_hits: false,
          query: { bool: { filter: baseFilters } },
          aggs: {
            sampling: {
              random_sampler: {
                probability: samplingProbability,
                seed,
              },
              aggs: {
                connections: {
                  composite: {
                    size: 10000,
                    sources: [
                      { dependencyName: { terms: { field: 'span.destination.service.resource' } } },
                      { eventOutcome: { terms: { field: 'event.outcome' } } },
                    ],
                  },
                  aggs: {
                    sample: {
                      top_metrics: {
                        size: 1,
                        metrics: [
                          { field: 'span.type' },
                          { field: 'span.subtype' },
                          { field: 'span.id' },
                        ],
                        sort: [{ '@timestamp': 'asc' as const }],
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const destinationsBySpanId = new Map<
          string,
          {
            dependencyName: string;
            spanId: string;
            spanType: string;
            spanSubtype: string;
          }
        >();

        // @ts-expect-error typed agg path
        const buckets = samplingResponse.aggregations?.sampling.connections.buckets ?? [];
        for (const bucket of buckets) {
          const sample = bucket.sample.top[0].metrics as Record<string, unknown>;
          const spanId = sample['span.id'] as string;
          destinationsBySpanId.set(spanId, {
            dependencyName: bucket.key.dependencyName as string,
            spanId,
            spanType: ((sample['span.type'] as string | null) ?? '') as string,
            spanSubtype: ((sample['span.subtype'] as string | null) ?? '') as string,
          });
        }

        // 3) Fetch transactions created by sampled exit spans (parent.id in span ids)
        const parentIds = Array.from(destinationsBySpanId.keys());

        if (parentIds.length > 0) {
          const transactionResponse = await typedSearch({
            index: transactionIndices,
            allow_no_indices: true,
            ignore_unavailable: true,
            size: parentIds.length,
            track_total_hits: false,
            fields: ['service.name', 'service.environment', 'agent.name', 'parent.id'],
            query: {
              bool: {
                filter: [
                  { terms: { 'parent.id': parentIds } },
                  // add a 5m buffer at the end of the time range (match APM implementation)
                  { range: { '@timestamp': { gte: start, lte: end + 1000 * 1000 * 60 * 5 } } },
                ],
              },
            },
          });

          for (const hit of transactionResponse.hits.hits) {
            const fields = (hit as any).fields as Record<string, any[]>;
            const spanId = String(fields['parent.id']?.[0]);
            const destination = destinationsBySpanId.get(spanId);
            if (destination) {
              destinationsBySpanId.set(spanId, {
                ...destination,
                // Keep only values we actually return later
                spanId,
                spanType: destination.spanType,
                spanSubtype: destination.spanSubtype,
                dependencyName: destination.dependencyName,
              });
              // We will resolve service.name/environment when building final items
              (destination as any).serviceName = String(fields['service.name']?.[0]);
            }
          }
        }

        // 4) Build nodes by dependency name and convert to expected output
        const items: Array<
          | { 'service.name': string; 'span.destination.service.resource': string }
          | {
              'span.destination.service.resource': string;
              'span.type': string;
              'span.subtype': string;
            }
        > = [];

        const nodesByDependencyName = new Map<string, any>();
        destinationsBySpanId.forEach((destination: any) => {
          const existing = nodesByDependencyName.get(destination.dependencyName) ?? {};
          nodesByDependencyName.set(destination.dependencyName, { ...existing, ...destination });
        });

        for (const [, node] of nodesByDependencyName) {
          if (node.serviceName) {
            items.push({
              'service.name': node.serviceName,
              'span.destination.service.resource': node.dependencyName!,
            });
          } else {
            items.push({
              'span.destination.service.resource': node.dependencyName,
              'span.type': node.spanType,
              'span.subtype': node.spanSubtype,
            });
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                dependencies: items,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching downstream dependencies: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch downstream dependencies: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

function environmentQuery(environment?: string) {
  // Mirrors APM's environmentQuery semantics
  const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
  const ENVIRONMENT_NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';
  const field = 'service.environment';

  if (environment === ENVIRONMENT_ALL) {
    return [];
  }

  if (!environment || environment === ENVIRONMENT_NOT_DEFINED) {
    return [
      {
        bool: {
          should: [
            { term: { [field]: ENVIRONMENT_NOT_DEFINED } },
            { bool: { must_not: [{ exists: { field } }] } },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }

  return [{ term: { [field]: environment } }];
}
