/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import * as t from 'io-ts';
import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticAgentVersionInfo } from '../../../common/types';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getAgentVersionInfo } from '../../lib/get_agent_version';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createManagedOtlpServiceApiKey } from '../../lib/api_key/create_managed_otlp_service_api_key';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import { IS_MANAGED_OTLP_SERVICE_ENABLED } from '../../../common/feature_flags';

const setupFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/otel_host/setup',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  async handler(resources): Promise<{
    onboardingId: string;
    elasticAgentVersionInfo: ElasticAgentVersionInfo;
    elasticsearchUrl: string;
    apiKeyEncoded: string;
    managedOtlpServiceUrl: string;
  }> {
    const {
      context,
      config,
      plugins,
      kibanaVersion,
      services: { esLegacyConfigService },
    } = resources;
    const {
      elasticsearch: { client },
      featureFlags,
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Insufficient permissions to create API key');
    }

    const fleetPluginStart = await plugins.fleet.start();
    const elasticAgentVersionInfo = await getAgentVersionInfo(fleetPluginStart, kibanaVersion);

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    const managedOtlpServiceUrl = getManagedOtlpServiceUrl(plugins);
    const isManagedOtlpServiceAvailable =
      config.serverless.enabled ||
      ((await featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false)) &&
        Boolean(managedOtlpServiceUrl));

    const { encoded: apiKeyEncoded } = isManagedOtlpServiceAvailable
      ? await createManagedOtlpServiceApiKey(client.asCurrentUser, `ingest-otel-host`)
      : await createShipperApiKey(client.asCurrentUser, `otel-host`);

    return {
      onboardingId: uuidv4(),
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      elasticAgentVersionInfo,
      apiKeyEncoded,
      managedOtlpServiceUrl: getManagedOtlpServiceUrl(plugins),
    };
  },
});

const hasOtelHostDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/otel_host/has-data',
  params: t.type({
    query: t.type({
      start: t.string,
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch',
    },
  },
  async handler(resources): Promise<{ hasData: boolean }> {
    const { start } = resources.params.query;
    const { elasticsearch } = await resources.context.core;

    try {
      const query: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [{ range: { '@timestamp': { gte: start } } }],
        },
      };

      const [logsResult, metricsResult] = await Promise.all([
        elasticsearch.client.asCurrentUser.search({
          index: ['logs-*.otel-*', 'logs.otel', 'logs.otel.*'],
          ignore_unavailable: true,
          allow_partial_search_results: true,
          size: 0,
          terminate_after: 1,
          query,
        }),
        elasticsearch.client.asCurrentUser.search({
          index: ['metrics-*.otel-*'],
          ignore_unavailable: true,
          allow_partial_search_results: true,
          size: 0,
          terminate_after: 1,
          query,
        }),
      ]);

      const hasLogs = (logsResult.hits.total as estypes.SearchTotalHits).value > 0;
      const hasMetrics = (metricsResult.hits.total as estypes.SearchTotalHits).value > 0;

      return { hasData: hasLogs || hasMetrics };
    } catch (error) {
      const errorType = error?.meta?.body?.error?.type;
      const rootCauseType = error?.meta?.body?.error?.root_cause?.[0]?.type;

      if (
        errorType === 'search_phase_execution_exception' &&
        rootCauseType === 'no_shard_available_action_exception'
      ) {
        return { hasData: false };
      }

      throw Boom.internal(`Elasticsearch responded with an error. ${error.message}`);
    }
  },
});

export const otelHostOnboardingRouteRepository = {
  ...setupFlowRoute,
  ...hasOtelHostDataRoute,
};
