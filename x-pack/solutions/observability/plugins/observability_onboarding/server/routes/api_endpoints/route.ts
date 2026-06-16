/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';

export interface ApiEndpointsRouteResponse {
  elasticsearchUrl: string;
  managedOtlpServiceUrl: string;
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

export const apiEndpointsRouteRepository = {
  ...apiEndpointsRoute,
};
