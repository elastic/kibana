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
import { createOtelShipperApiKey } from '../../lib/api_key/create_otel_shipper_api_key';
import { createVerificationApiKey } from '../../lib/api_key/create_verification_api_key';
import { getAgentVersionInfo } from '../../lib/get_agent_version';

export interface CreateAgentOnboardingFlowRouteResponse {
  onboardingId: string;
  shipperApiKeyEncoded: string;
  verificationApiKeyEncoded: string;
  elasticsearchUrl: string;
  kibanaUrl: string;
  skillInstallScriptUrl: string;
  stackVersion: string;
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
    const { context, plugins, services, core, kibanaVersion } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const fleetPluginStart = await plugins.fleet.start();

    const [
      { encoded: shipperApiKeyEncoded },
      { encoded: verificationApiKeyEncoded },
      elasticAgentVersionInfo,
    ] = await Promise.all([
      createOtelShipperApiKey(client.asCurrentUser, 'agent-onboarding'),
      createVerificationApiKey(client.asCurrentUser, 'agent-onboarding'),
      getAgentVersionInfo(fleetPluginStart, kibanaVersion),
    ]);

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);

    const skillInstallScriptUrl = new URL(
      core.setup.http.staticAssets.getPluginAssetHref('install_agent_skill.sh'),
      kibanaUrl
    ).toString();

    return {
      onboardingId: uuidv4(),
      shipperApiKeyEncoded,
      verificationApiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      kibanaUrl,
      skillInstallScriptUrl,
      stackVersion: elasticAgentVersionInfo.agentVersion,
    };
  },
});

export const agentOnboardingRouteRepository = {
  ...createAgentOnboardingFlowRoute,
};
