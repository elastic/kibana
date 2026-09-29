/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { existsQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  findInventoryFields,
  findInventoryModel,
  METRICSET_MODULE,
} from '@kbn/metrics-data-access-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import {
  getHasDataQueryParamsRT,
  getHasDataResponseRT,
  getTimeRangeMetadataQueryParamsRT,
  getTimeRangeMetadataResponseRT,
} from '../../../common/metrics_sources/get_has_data';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';
import { AnomalyThresholdRangeError, NoSuchRemoteClusterError } from '../../lib/sources/errors';
import type { MetricsSourceStatus } from '../../../common/metrics_sources';
import {
  metricsSourceConfigurationResponseRT,
  partialMetricsSourceConfigurationReqPayloadRT,
} from '../../../common/metrics_sources';
import type { InfraSource } from '../../lib/sources';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getPreferredSchema } from '../../lib/helpers/get_preferred_schema';
import { TIMESTAMP_FIELD } from '../../../common/constants';

const defaultStatus = {
  metricIndicesExist: false,
  remoteClustersExist: false,
};

/**
 * Transport-level timeout for each phase of the hasData probe. Without a bound
 * this search can hang indefinitely on an overloaded cluster or an unreachable
 * CCS remote. Mirrors the same guard in InfraElasticsearchSourceStatusAdapter.
 */
const HAS_DATA_REQUEST_TIMEOUT = '30s';

/**
 * Recent-data window for the fast phase-1 probe, expressed as ES date-math
 * rounded to the hour. Rounding is what makes the result eligible for the
 * shard request cache, so repeated calls within a polling interval are
 * near-free. Written inline (not via rangeQuery) to avoid the epoch_millis
 * format that the helper emits, which disables cache eligibility.
 */
const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

export const initMetricsSourceConfigurationRoutes = (libs: InfraBackendLibs) => {
  const { framework, logger } = libs;

  const composeSourceStatus = async (
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<MetricsSourceStatus> => {
    try {
      const hasMetricIndices = await libs.sourceStatus.hasMetricIndices(requestContext, sourceId);
      return {
        metricIndicesExist: hasMetricIndices,
        remoteClustersExist: true,
      };
    } catch (err) {
      logger.error(err);

      if (err instanceof NoSuchRemoteClusterError) {
        return defaultStatus;
      }

      return {
        metricIndicesExist: false,
        remoteClustersExist: true,
      };
    }
  };

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/{sourceId}',
      validate: {
        params: schema.object({
          sourceId: schema.string({ maxLength: 256 }),
        }),
        query: schema.object({
          includeStatus: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { sourceId } = request.params;
      const { includeStatus } = request.query;
      const soClient = (await requestContext.core).savedObjects.client;

      try {
        const [sourceSettled, statusSettled] = await Promise.allSettled([
          libs.sources.getSourceConfiguration(soClient, sourceId),
          includeStatus
            ? composeSourceStatus(requestContext, sourceId)
            : Promise.resolve(defaultStatus),
        ]);

        const source = isFulfilled<InfraSource>(sourceSettled) ? sourceSettled.value : null;
        const status = isFulfilled<MetricsSourceStatus>(statusSettled)
          ? statusSettled.value
          : defaultStatus;

        if (!source) {
          return response.notFound();
        }

        const sourceResponse = {
          source: {
            ...source,
            ...(includeStatus ? { status } : {}),
          },
        };

        return response.ok({
          body: metricsSourceConfigurationResponseRT.encode(sourceResponse),
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );

  framework.registerRoute(
    {
      method: 'patch',
      path: '/api/metrics/source/{sourceId}',
      validate: {
        params: schema.object({
          sourceId: schema.string({ maxLength: 256 }),
        }),
        body: createRouteValidationFunction(partialMetricsSourceConfigurationReqPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sources } = libs;
      const { sourceId } = request.params;
      const sourceConfigurationPayload = request.body;

      try {
        const soClient = (await requestContext.core).savedObjects.client;
        const sourceConfiguration = await sources.getSourceConfiguration(soClient, sourceId);

        if (sourceConfiguration.origin === 'internal') {
          response.conflict({
            body: 'A conflicting read-only source configuration already exists.',
          });
        }

        const sourceConfigurationExists = sourceConfiguration.origin === 'stored';
        const patchedSourceConfiguration = await (sourceConfigurationExists
          ? sources.updateSourceConfiguration(soClient, sourceId, sourceConfigurationPayload)
          : sources.createSourceConfiguration(soClient, sourceId, sourceConfigurationPayload));

        const status = await composeSourceStatus(requestContext, sourceId);

        const sourceResponse = {
          source: { ...patchedSourceConfiguration, status },
        };

        return response.ok({
          body: metricsSourceConfigurationResponseRT.encode(sourceResponse),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (error instanceof AnomalyThresholdRangeError) {
          return response.customError({
            statusCode: 400,
            body: {
              message: error.message,
            },
          });
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/{sourceId}/hasData',
      validate: {
        params: schema.object({
          sourceId: schema.string({ maxLength: 256 }),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { sourceId } = request.params;

      const client = createSearchClient(requestContext, framework);
      const soClient = (await requestContext.core).savedObjects.client;
      const source = await libs.sources.getSourceConfiguration(soClient, sourceId);

      const results = await hasData(source.configuration.metricAlias, client);

      return response.ok({
        body: { hasData: results, configuration: source.configuration },
      });
    }
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/hasData',
      validate: {
        query: createRouteValidationFunction(getHasDataQueryParamsRT),
      },
    },
    async (context, request, response) => {
      try {
        const { source } = request.query;

        const infraMetricsClient = await getInfraMetricsClient({
          request,
          libs,
          context,
        });

        const hostInventoryModel = findInventoryModel('host');
        const hostIntegration =
          typeof hostInventoryModel?.requiredIntegration !== 'object' ||
          !('otel' in hostInventoryModel?.requiredIntegration)
            ? undefined
            : hostInventoryModel.requiredIntegration;

        // The entity-field clauses are identical for both phases; only the
        // filter context (range + tier exclusion) differs between them.
        const entityClauses =
          source === 'all'
            ? [
                ...existsQuery(hostInventoryModel.fields.id),
                ...existsQuery(findInventoryFields('container').id),
                ...existsQuery(findInventoryFields('pod').id),
                ...existsQuery(findInventoryFields('awsEC2').id),
                ...existsQuery(findInventoryFields('awsS3').id),
                ...existsQuery(findInventoryFields('awsRDS').id),
                ...existsQuery(findInventoryFields('awsSQS').id),
              ]
            : source === 'host' && hostIntegration
            ? [
                ...termQuery(EVENT_MODULE, hostIntegration.beats),
                ...termQuery(METRICSET_MODULE, hostIntegration.beats),
                ...termQuery(DATASTREAM_DATASET, hostIntegration.otel),
              ]
            : [];

        /**
         * Phase 1 — fast path.
         *
         * Restrict to recent data on hot/warm tiers so Elasticsearch's
         * can_match pre-filter can prune cold/frozen shards and CCS remote
         * shards that hold no recent data. On a live deployment this probe
         * hits only a handful of shards and returns in milliseconds.
         *
         * `data_cold` and `data_frozen` are excluded rather than
         * `data_hot`/`data_warm` being included, so that legacy metricbeat-*
         * indices and self-managed clusters without tier roles (which land in
         * `data_content` or have no `_tier`) are not incorrectly pushed to
         * the slow fallback.
         *
         * The `@timestamp` range is expressed as rounded date math so the
         * result is eligible for the ES shard request cache, making repeated
         * calls within the same hour near-free.
         */
        const phase1Response = await infraMetricsClient.search({
          track_total_hits: 1,
          terminate_after: 1,
          size: 0,
          allow_no_indices: true,
          requestTimeout: HAS_DATA_REQUEST_TIMEOUT,
          query: {
            bool: {
              filter: [
                {
                  range: {
                    [TIMESTAMP_FIELD]: { gte: HAS_DATA_RECENT_WINDOW },
                  },
                },
                ...excludeTiersQuery(['data_cold', 'data_frozen']),
              ],
              should: entityClauses,
              minimum_should_match: 1,
            },
          },
        });

        if (phase1Response.hits.total.value > 0) {
          return response.ok({
            body: getHasDataResponseRT.encode({ hasData: true }),
          });
        }

        /**
         * Phase 2 — exact fallback.
         *
         * Phase 1 found nothing, which means either the cluster is genuinely
         * empty or all its data is older than HAS_DATA_RECENT_WINDOW (or
         * lives solely in cold/frozen tiers). Re-run without bounds to
         * preserve the original "any metrics doc, anywhere, ever" semantics.
         *
         * CCS guard: a zero-hit response that is also incomplete (timed_out,
         * shard failures, or skipped/failed CCS clusters) must not be
         * interpreted as "no data". The client treats a successful
         * `hasData: false` as a prompt to show the onboarding screen, which
         * would be wrong for an established deployment whose remotes were
         * temporarily unreachable. Throw instead so the existing catch block
         * maps it to a customError and the UI leaves the page intact.
         */
        const phase2Response = await infraMetricsClient.search({
          track_total_hits: 1,
          terminate_after: 1,
          size: 0,
          allow_no_indices: true,
          requestTimeout: HAS_DATA_REQUEST_TIMEOUT,
          query: {
            bool: {
              should: entityClauses,
              minimum_should_match: 1,
            },
          },
        });

        const isInconclusiveResponse =
          phase2Response.timed_out === true ||
          phase2Response._shards.failed > 0 ||
          // _clusters is present only on CCS responses; skipped/failed remotes
          // mean our zero-hit result may be incomplete.
          (phase2Response._clusters != null &&
            (phase2Response._clusters.skipped > 0 || phase2Response._clusters.failed > 0));

        if (isInconclusiveResponse) {
          throw new Error(
            'hasData check returned an inconclusive result due to shard failures or unreachable CCS remotes'
          );
        }

        return response.ok({
          body: getHasDataResponseRT.encode({
            hasData: phase2Response.hits.total.value > 0,
          }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/time_range_metadata',
      validate: {
        query: createRouteValidationFunction(getTimeRangeMetadataQueryParamsRT),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, dataSource, kuery, filters, isInventoryView } = request.query;
        const infraMetricsClient = await getInfraMetricsClient({
          request,
          libs,
          context,
        });

        const { schemas, preferredSchema } = await getPreferredSchema({
          infraMetricsClient,
          dataSource,
          from,
          to,
          kuery,
          filters,
          isInventoryView,
        });

        return response.ok({
          body: getTimeRangeMetadataResponseRT.encode({
            schemas,
            preferredSchema,
          }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};

const isFulfilled = <Type>(
  promiseSettlement: PromiseSettledResult<Type>
): promiseSettlement is PromiseFulfilledResult<Type> => promiseSettlement.status === 'fulfilled';
