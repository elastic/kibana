/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import { resolveApiKeyFactory } from '../../lib/api_key/resolve_api_key_factory';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { IS_MANAGED_OTLP_SERVICE_ENABLED } from '../../../common/feature_flags';

export interface ApiEndpointsRouteResponse {
  elasticsearchUrl: string;
  managedOtlpServiceUrl: string;
}

export interface ApiEndpointApiKeyResponse {
  encodedApiKey: string;
}

const apiEndpointsRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/api_endpoints',
  security: {
    authz: {
      enabled: false,
      reason:
        'This route only returns deployment-level configuration URLs (Elasticsearch and managed OTLP service) that are already exposed by other onboarding routes',
    },
  },
  async handler(resources): Promise<ApiEndpointsRouteResponse> {
    const { plugins, services } = resources;

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud.setup.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      managedOtlpServiceUrl: getManagedOtlpServiceUrl(plugins),
    };
  },
});

const createApiKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/api_endpoints/create_key/{id}',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by custom logic using the Elasticsearch client',
    },
  },
  params: t.type({
    path: t.type({
      id: t.keyof({
        [ApiEndpointId.Prometheus]: null,
        [ApiEndpointId.OpenTelemetry]: null,
        [ApiEndpointId.Elasticsearch]: null,
      }),
    }),
  }),
  async handler(resources): Promise<ApiEndpointApiKeyResponse> {
    const {
      context,
      config,
      plugins,
      params: {
        path: { id },
      },
    } = resources;
    const {
      elasticsearch: { client },
      featureFlags,
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(
      client.asCurrentUser,
      id === ApiEndpointId.Elasticsearch
    );
    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to create an API key. Contact your system administrator to grant you the required privileges."
      );
    }

    const managedOtlpServiceUrl = getManagedOtlpServiceUrl(plugins);
    const isManagedOtlpServiceAvailable =
      config.serverless.enabled ||
      ((await featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false)) &&
        Boolean(managedOtlpServiceUrl));

    const createApiKey = resolveApiKeyFactory(id, isManagedOtlpServiceAvailable);
    const { encoded } = await createApiKey(client.asCurrentUser, `onboarding-${id}-api`);

    return { encodedApiKey: encoded };
  },
});

export const apiEndpointsRouteRepository = {
  ...apiEndpointsRoute,
  ...createApiKeyRoute,
};
