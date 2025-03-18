/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { ElasticAgentVersionInfo } from '../../../common/types';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getKibanaUrl } from '../../lib/get_fallback_urls';
import { getAgentVersionInfo } from '../../lib/get_agent_version';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';

const logMonitoringPrivilegesRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/logs/setup/privileges',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  handler: async (resources): Promise<{ hasPrivileges: boolean }> => {
    const { context } = resources;

    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    return { hasPrivileges };
  },
});

const installShipperSetupRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/logs/setup/environment',
  security: {
    authz: {
      enabled: false,
      reason: "This route only reads cluster's metadata and does not require authorization",
    },
  },
  async handler(resources): Promise<{
    apiEndpoint: string;
    scriptDownloadUrl: string;
    elasticAgentVersionInfo: ElasticAgentVersionInfo;
    elasticsearchUrl: string[];
  }> {
    const {
      core,
      plugins,
      kibanaVersion,
      services: { esLegacyConfigService },
    } = resources;

    const fleetPluginStart = await plugins.fleet.start();
    const elasticAgentVersionInfo = await getAgentVersionInfo(fleetPluginStart, kibanaVersion);
    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);
    const scriptDownloadUrl = new URL(
      core.setup.http.staticAssets.getPluginAssetHref('standalone_agent_setup.sh'),
      kibanaUrl
    ).toString();

    const apiEndpoint = new URL(`${kibanaUrl}/internal/observability_onboarding`).toString();

    const elasticsearchUrl = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    return {
      apiEndpoint,
      elasticsearchUrl,
      scriptDownloadUrl,
      elasticAgentVersionInfo,
    };
  },
});

const createAPIKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/otel/api_key',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  params: t.type({}),
  async handler(resources): Promise<{ apiKeyEncoded: string }> {
    const { context } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Insufficient permissions to create shipper API key');
    }

    const { encoded: apiKeyEncoded } = await createShipperApiKey(client.asCurrentUser, 'otel logs');

    return { apiKeyEncoded };
  },
});

export const logsOnboardingRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createAPIKeyRoute,
};
