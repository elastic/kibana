/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { termQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import {
  isNoShardsAvailableError,
  throwHasDataSearchError,
} from '../../lib/handle_has_data_search_error';
import type { ElasticAgentVersionInfo } from '../../../common/types';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { hasFleetIntegrationPrivileges } from '../../lib/api_key/has_fleet_integration_privileges';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { getAgentVersionInfo } from '../../lib/get_agent_version';
import { createManagedOtlpServiceApiKey } from '../../lib/api_key/create_managed_otlp_service_api_key';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import { IS_MANAGED_OTLP_SERVICE_ENABLED } from '../../../common/feature_flags';

export interface CreateKubernetesOnboardingFlowRouteResponse {
  apiKeyEncoded: string;
  onboardingId: string;
  elasticsearchUrl: string;
  elasticAgentVersionInfo: ElasticAgentVersionInfo;
  managedOtlpServiceUrl: string;
}

export interface HasKubernetesDataRouteResponse {
  hasData: boolean;
  hasLogs?: boolean;
  hasMetrics?: boolean;
}

const createKubernetesOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/kubernetes/flow',
  params: t.type({
    body: t.type({ pkgName: t.union([t.literal('kubernetes'), t.literal('kubernetes_otel')]) }),
  }),
  security: {
    authz: {
      enabled: false,
      reason:
        'Authorization is checked by custom logic using Elasticsearch client and by the Package Service client',
    },
  },
  async handler(resources): Promise<CreateKubernetesOnboardingFlowRouteResponse> {
    const { context, request, params, plugins, services, kibanaVersion, config } = resources;
    const {
      elasticsearch: { client },
      featureFlags,
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser, true);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const fleetPluginStart = await plugins.fleet.start();

    // Check Fleet integration privileges before attempting to install packages
    const hasFleetPrivileges = await hasFleetIntegrationPrivileges(request, fleetPluginStart);

    if (!hasFleetPrivileges) {
      throw Boom.forbidden(
        "You don't have adequate permissions to install Fleet packages. Contact your system administrator to grant you the required 'Integrations All' privilege."
      );
    }

    const packageClient = fleetPluginStart.packageService.asScoped(request);
    const managedOtlpServiceUrl = getManagedOtlpServiceUrl(plugins);
    const isManagedOtlpServiceAvailable =
      config.serverless.enabled ||
      ((await featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false)) &&
        Boolean(managedOtlpServiceUrl));

    const apiKeyPromise =
      isManagedOtlpServiceAvailable && params.body.pkgName === 'kubernetes_otel'
        ? createManagedOtlpServiceApiKey(client.asCurrentUser, `ingest-otel-k8s`)
        : createShipperApiKey(
            client.asCurrentUser,
            params.body.pkgName === 'kubernetes_otel' ? 'otel-kubernetes' : 'kubernetes',
            true
          );

    const [{ encoded: apiKeyEncoded }, elasticAgentVersionInfo] = await Promise.all([
      apiKeyPromise,
      getAgentVersionInfo(fleetPluginStart, kibanaVersion),
      // System package is always required
      packageClient.ensureInstalledPackage({ pkgName: 'system' }),
      // Kubernetes package is required for both classic kubernetes and otel
      packageClient.ensureInstalledPackage({ pkgName: 'kubernetes' }),
      // Kubernetes otel package is required only for otel
      params.body.pkgName === 'kubernetes_otel'
        ? packageClient.ensureInstalledPackage({ pkgName: 'kubernetes_otel' })
        : undefined,
    ]);

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      elasticAgentVersionInfo,
      managedOtlpServiceUrl: getManagedOtlpServiceUrl(plugins),
    };
  },
});

const hasKubernetesDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/kubernetes/{onboardingId}/has-data',
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch',
    },
  },
  async handler(resources): Promise<HasKubernetesDataRouteResponse> {
    const { onboardingId } = resources.params.path;
    const { elasticsearch } = await resources.context.core;

    try {
      const query: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  ...termQuery('fields.onboarding_id', onboardingId),
                  ...termQuery('resource.attributes.onboarding.id', onboardingId),
                  ...termQuery('resource.attributes.onboarding.id._rt', onboardingId),
                  ...termQuery('labels.onboarding_id', onboardingId),
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      // Logs Essentials + Wired Streams: logs.otel uses a passthrough mapping for
      // resource.attributes, storing fields in _source without indexing them.
      // We use a distinct runtime field name so it does not shadow the indexed
      // mapping on classic streams where resource.attributes.onboarding.id is
      // already a keyword. The query includes both names in the should clause.
      const runtimeMappings: estypes.MappingRuntimeFields = {
        'resource.attributes.onboarding.id._rt': {
          type: 'keyword',
          script: {
            source:
              "def v = params._source?.resource?.attributes?.get('onboarding.id'); if (v != null) emit(v.toString())",
          },
        },
      };

      const [logsResult, metricsResult] = await Promise.allSettled([
        elasticsearch.client.asCurrentUser.search({
          index: ['logs-*', 'logs.*'],
          ignore_unavailable: true,
          allow_partial_search_results: true,
          size: 0,
          terminate_after: 1,
          runtime_mappings: runtimeMappings,
          query,
        }),
        elasticsearch.client.asCurrentUser.search({
          index: ['metrics-*', 'metrics.*'],
          ignore_unavailable: true,
          allow_partial_search_results: true,
          size: 0,
          terminate_after: 1,
          runtime_mappings: runtimeMappings,
          query,
        }),
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
        hasLogs,
        hasMetrics,
      };
    } catch (error) {
      if (isNoShardsAvailableError(error)) {
        return {
          hasData: false,
          hasLogs: false,
          hasMetrics: false,
        };
      }

      throwHasDataSearchError(error);
    }
  },
});

export const kubernetesOnboardingRouteRepository = {
  ...createKubernetesOnboardingFlowRoute,
  ...hasKubernetesDataRoute,
};
