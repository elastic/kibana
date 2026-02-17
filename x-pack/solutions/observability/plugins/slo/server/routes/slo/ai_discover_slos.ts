/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { badRequest } from '@hapi/boom';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { createSloServerRoute } from '../create_slo_server_route';
import { getDefaultConnectorId } from '../../services/ai/get_default_connector';
import {
  SLO_DISCOVER_SYSTEM_PROMPT,
  SLO_DISCOVER_OUTPUT_SCHEMA,
} from '../../services/ai/slo_generation_prompt';
import { normalizeSloDefinition } from '../../services/ai/normalize_slo_definition';

const aiDiscoverSlosParamsSchema = t.partial({
  body: t.partial({
    connectorId: t.string,
  }),
});

export const aiDiscoverSlosRoute = createSloServerRoute({
  endpoint: 'POST /internal/slo/ai/discover',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: aiDiscoverSlosParamsSchema,
  handler: async ({ params, logger, request, corePlugins, getInference, getScopedClients }) => {
    const inference = await getInference();

    if (!inference) {
      throw badRequest(
        'AI-assisted SLO discovery is not available. The inference plugin is not enabled.'
      );
    }

    const [coreStart] = await corePlugins.getStartServices();
    const { scopedClusterClient } = await getScopedClients({ request, logger });

    const requestedConnectorId = params.body?.connectorId;

    const connectorId =
      requestedConnectorId ??
      (await getDefaultConnectorId({
        coreStart,
        inference,
        request,
        logger,
      }));

    const clusterSummary = await buildClusterDataSummary(scopedClusterClient, logger);

    const inferenceClient = inference.getClient({ request });

    const input = `Analyze the following cluster data summary and propose user-centric SLOs:\n\n${clusterSummary}`;

    const response = await inferenceClient.output({
      id: 'slo-ai-discover',
      connectorId,
      system: SLO_DISCOVER_SYSTEM_PROMPT,
      input,
      schema: SLO_DISCOVER_OUTPUT_SCHEMA,
    });

    const { proposedSlos, summary } = response.output ?? {
      proposedSlos: [],
      summary: 'No data sources found in the cluster.',
    };

    const normalizedSlos = Array.isArray(proposedSlos)
      ? proposedSlos.map((proposal) => ({
          ...proposal,
          sloDefinition: normalizeSloDefinition(proposal.sloDefinition),
        }))
      : [];

    return {
      proposedSlos: normalizedSlos,
      summary: summary ?? '',
      clusterSummary,
    };
  },
});

/**
 * Queries the cluster to build a summary of available data sources for SLO discovery.
 */
async function buildClusterDataSummary(
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string> {
  const sections: string[] = [];

  const [apmServices, syntheticsMonitors, logDataStreams, metricDataStreams] = await Promise.all([
    discoverApmServices(scopedClusterClient, logger),
    discoverSyntheticsMonitors(scopedClusterClient, logger),
    discoverLogDataStreams(scopedClusterClient, logger),
    discoverMetricDataStreams(scopedClusterClient, logger),
  ]);

  if (apmServices.length > 0) {
    sections.push(`## APM Services (${apmServices.length} found)\n${apmServices.join('\n')}`);
  }

  if (syntheticsMonitors.length > 0) {
    sections.push(
      `## Synthetics Monitors (${syntheticsMonitors.length} found)\n${syntheticsMonitors.join(
        '\n'
      )}`
    );
  }

  if (logDataStreams.length > 0) {
    sections.push(
      `## Log Data Streams (${logDataStreams.length} found)\n${logDataStreams.join('\n')}`
    );
  }

  if (metricDataStreams.length > 0) {
    sections.push(
      `## Metric Data Streams (${metricDataStreams.length} found)\n${metricDataStreams.join('\n')}`
    );
  }

  if (sections.length === 0) {
    return 'No relevant data sources found in the cluster. Unable to propose SLOs.';
  }

  return sections.join('\n\n');
}

async function discoverApmServices(
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await scopedClusterClient.asCurrentUser.search({
      index: 'traces-apm*,apm-*',
      size: 0,
      body: {
        query: { range: { '@timestamp': { gte: 'now-24h' } } },
        aggs: {
          services: {
            terms: { field: 'service.name', size: 50 },
            aggs: {
              environments: {
                terms: { field: 'service.environment', size: 10 },
              },
              transaction_types: {
                terms: { field: 'transaction.type', size: 10 },
              },
            },
          },
        },
      },
    });

    const servicesAgg = response.aggregations?.services as
      | {
          buckets: Array<{
            key: string;
            doc_count: number;
            environments: { buckets: Array<{ key: string }> };
            transaction_types: { buckets: Array<{ key: string }> };
          }>;
        }
      | undefined;

    if (!servicesAgg?.buckets?.length) return [];

    return servicesAgg.buckets.map((bucket) => {
      const envs = bucket.environments.buckets.map((e) => e.key).join(', ') || 'unknown';
      const txTypes = bucket.transaction_types.buckets.map((t) => t.key).join(', ') || 'request';
      return `- Service: "${bucket.key}" | Environments: [${envs}] | Transaction types: [${txTypes}] | Events (24h): ${bucket.doc_count}`;
    });
  } catch (error) {
    logger.debug(`Failed to discover APM services: ${error.message}`);
    return [];
  }
}

async function discoverSyntheticsMonitors(
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await scopedClusterClient.asCurrentUser.search({
      index: 'synthetics-*',
      size: 0,
      body: {
        query: { range: { '@timestamp': { gte: 'now-24h' } } },
        aggs: {
          monitors: {
            terms: { field: 'monitor.id', size: 50 },
            aggs: {
              name: { terms: { field: 'monitor.name', size: 1 } },
              type: { terms: { field: 'monitor.type', size: 1 } },
              tags: { terms: { field: 'tags', size: 10 } },
              projects: { terms: { field: 'monitor.project.id', size: 5 } },
            },
          },
        },
      },
    });

    const monitorsAgg = response.aggregations?.monitors as
      | {
          buckets: Array<{
            key: string;
            doc_count: number;
            name: { buckets: Array<{ key: string }> };
            type: { buckets: Array<{ key: string }> };
            tags: { buckets: Array<{ key: string }> };
            projects: { buckets: Array<{ key: string }> };
          }>;
        }
      | undefined;

    if (!monitorsAgg?.buckets?.length) return [];

    return monitorsAgg.buckets.map((bucket) => {
      const name = bucket.name.buckets[0]?.key ?? bucket.key;
      const type = bucket.type.buckets[0]?.key ?? 'unknown';
      const tags = bucket.tags.buckets.map((t) => t.key).join(', ') || 'none';
      const projects = bucket.projects.buckets.map((p) => p.key).join(', ') || 'none';
      return `- Monitor: "${name}" (id: ${bucket.key}) | Type: ${type} | Tags: [${tags}] | Projects: [${projects}] | Checks (24h): ${bucket.doc_count}`;
    });
  } catch (error) {
    logger.debug(`Failed to discover synthetics monitors: ${error.message}`);
    return [];
  }
}

async function discoverLogDataStreams(
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await scopedClusterClient.asCurrentUser.search({
      index: 'logs-*',
      size: 0,
      body: {
        query: { range: { '@timestamp': { gte: 'now-24h' } } },
        aggs: {
          data_streams: {
            terms: { field: '_index', size: 30 },
            aggs: {
              error_count: {
                filter: {
                  bool: {
                    should: [
                      { term: { 'log.level': 'error' } },
                      { term: { 'log.level': 'ERROR' } },
                      { term: { 'log.level': 'fatal' } },
                      { term: { 'log.level': 'FATAL' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
              services: {
                terms: { field: 'service.name', size: 5 },
              },
            },
          },
        },
      },
    });

    const dataStreamsAgg = response.aggregations?.data_streams as
      | {
          buckets: Array<{
            key: string;
            doc_count: number;
            error_count: { doc_count: number };
            services: { buckets: Array<{ key: string }> };
          }>;
        }
      | undefined;

    if (!dataStreamsAgg?.buckets?.length) return [];

    return dataStreamsAgg.buckets
      .filter((bucket) => bucket.doc_count > 100)
      .map((bucket) => {
        const errorRate =
          bucket.doc_count > 0
            ? ((bucket.error_count.doc_count / bucket.doc_count) * 100).toFixed(2)
            : '0';
        const services = bucket.services.buckets.map((s) => s.key).join(', ') || 'none';
        return `- Index: "${bucket.key}" | Events (24h): ${bucket.doc_count} | Error rate: ${errorRate}% | Services: [${services}]`;
      });
  } catch (error) {
    logger.debug(`Failed to discover log data streams: ${error.message}`);
    return [];
  }
}

async function discoverMetricDataStreams(
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await scopedClusterClient.asCurrentUser.search({
      index: 'metrics-*',
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{ range: { '@timestamp': { gte: 'now-24h' } } }],
            must_not: [{ prefix: { _index: 'metrics-apm' } }],
          },
        },
        aggs: {
          data_streams: {
            terms: { field: '_index', size: 20 },
            aggs: {
              hosts: {
                cardinality: { field: 'host.name' },
              },
            },
          },
        },
      },
    });

    const dataStreamsAgg = response.aggregations?.data_streams as
      | {
          buckets: Array<{
            key: string;
            doc_count: number;
            hosts: { value: number };
          }>;
        }
      | undefined;

    if (!dataStreamsAgg?.buckets?.length) return [];

    return dataStreamsAgg.buckets
      .filter((bucket) => bucket.doc_count > 100)
      .map((bucket) => {
        return `- Index: "${bucket.key}" | Datapoints (24h): ${bucket.doc_count} | Unique hosts: ${bucket.hosts.value}`;
      });
  } catch (error) {
    logger.debug(`Failed to discover metric data streams: ${error.message}`);
    return [];
  }
}
