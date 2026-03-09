/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { getFallbackESUrl, getKibanaUrl } from '../../lib/get_fallback_urls';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';

export interface CreateAgentOnboardingFlowRouteResponse {
  onboardingId: string;
  apiKeyEncoded: string;
  elasticsearchUrl: string;
  kibanaUrl: string;
}

const createAgentOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/agent/flow',
  security: {
    authz: {
      enabled: false,
      reason:
        'Authorization is checked by custom logic using Elasticsearch client privileges check',
    },
  },
  async handler(resources): Promise<CreateAgentOnboardingFlowRouteResponse> {
    const { context, plugins, services, core } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const [{ encoded: apiKeyEncoded }] = await Promise.all([
      createShipperApiKey(client.asCurrentUser, 'agent-onboarding'),
    ]);

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      kibanaUrl,
    };
  },
});

export const agentOnboardingRouteRepository = {
  ...createAgentOnboardingFlowRoute,
};
