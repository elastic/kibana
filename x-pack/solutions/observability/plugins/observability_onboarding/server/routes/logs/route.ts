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
import { saveObservabilityOnboardingFlow } from '../../lib/state';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { ObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createManagedOtlpServiceApiKey } from '../../lib/api_key/create_managed_otlp_service_api_key';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';

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
    managedOtlpServiceUrl: string;
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
      managedOtlpServiceUrl: await getManagedOtlpServiceUrl(resources),
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
  async handler({ context, config }): Promise<{ apiKeyEncoded: string }> {
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Insufficient permissions to create shipper API key');
    }

    const timestamp = new Date().toISOString();
    const { encoded: apiKeyEncoded } = config.serverless.enabled
      ? await createManagedOtlpServiceApiKey(client.asCurrentUser, `ingest-otel-host-${timestamp}`)
      : await createShipperApiKey(client.asCurrentUser, `otel-logs-${timestamp}`);

    return { apiKeyEncoded };
  },
});

const createFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/logs/flow',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by the Saved Object client and Elasticsearch client',
    },
  },
  params: t.type({
    body: t.intersection([
      t.type({
        name: t.string,
      }),
      t.type({
        type: t.literal('logFiles'),
      }),
      t.partial({
        state: t.record(t.string, t.unknown),
      }),
    ]),
  }),
  async handler(resources): Promise<{ apiKeyEncoded: string; onboardingId: string }> {
    const {
      context,
      params: {
        body: { name, type, state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const {
      elasticsearch: { client },
    } = await context.core;
    const { encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      `standalone_agent_logs_onboarding_${name}`
    );

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    const { id } = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      observabilityOnboardingState: {
        type,
        state: state as ObservabilityOnboardingFlow['state'],
        progress: {},
      },
    });

    return { apiKeyEncoded, onboardingId: id };
  },
});

export const logsOnboardingRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createFlowRoute,
  ...createAPIKeyRoute,
};
