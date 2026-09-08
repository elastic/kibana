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
import {
  isNoShardsAvailableError,
  throwHasDataSearchError,
} from '../../lib/handle_has_data_search_error';
import { checkPreExistingData } from '../../lib/check_pre_existing_data';
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
    query: t.intersection([t.type({ start: t.string }), t.partial({ osType: t.string })]),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch',
    },
  },
  async handler(resources): Promise<{ hasData: boolean; hasPreExistingData?: boolean }> {
    const { start, osType } = resources.params.query;
    const { elasticsearch } = await resources.context.core;

    const allIndices = ['logs-*.otel-*', 'logs.otel', 'logs.otel.*', 'metrics-*.otel-*'];

    const filters: estypes.QueryDslQueryContainer[] = [{ range: { '@timestamp': { gte: start } } }];
    if (osType) {
      filters.push({ term: { 'host.os.type': osType } });
    }
    const query: estypes.QueryDslQueryContainer = {
      bool: { filter: filters },
    };

    const [preExisting, [logsResult, metricsResult]] = await Promise.all([
      checkPreExistingData(elasticsearch.client.asCurrentUser, allIndices, start),
      Promise.allSettled([
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
      ]),
    ]);

    const resolveProbe = (result: PromiseSettledResult<estypes.SearchResponse>): boolean => {
      if (result.status === 'fulfilled') {
        return (result.value.hits.total as estypes.SearchTotalHits).value > 0;
      }
      if (isNoShardsAvailableError(result.reason)) {
        return false;
      }
      throwHasDataSearchError(result.reason);
    };

    const hasLogs = resolveProbe(logsResult);
    const hasMetrics = resolveProbe(metricsResult);

    return {
      hasData: hasLogs || hasMetrics,
      hasPreExistingData: preExisting || undefined,
    };
  },
});

export const otelHostOnboardingRouteRepository = {
  ...setupFlowRoute,
  ...hasOtelHostDataRoute,
};
