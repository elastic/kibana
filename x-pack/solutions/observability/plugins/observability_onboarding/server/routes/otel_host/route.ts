/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { ElasticAgentVersionInfo } from '../../../common/types';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getAgentVersionInfo } from '../../lib/get_agent_version';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';

const setupFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/otel_host/setup',
  params: t.partial({
    query: t.type({
      agentVersionPattern: t.string,
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  options: { tags: [] },
  async handler(resources): Promise<{
    elasticAgentVersionInfo: ElasticAgentVersionInfo;
    elasticsearchUrl: string;
    apiKeyEncoded: string;
  }> {
    const {
      context,
      plugins,
      kibanaVersion,
      services: { esLegacyConfigService },
      params,
    } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Insufficient permissions to create API key');
    }

    const fleetPluginStart = await plugins.fleet.start();
    const elasticAgentVersionInfo = await getAgentVersionInfo(
      fleetPluginStart,
      kibanaVersion,
      params?.query?.agentVersionPattern
    );

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    const { encoded: apiKeyEncoded } = await createShipperApiKey(client.asCurrentUser, `otel-host`);

    return {
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      elasticAgentVersionInfo,
      apiKeyEncoded,
    };
  },
});

export const otelHostOnboardingRouteRepository = {
  ...setupFlowRoute,
};
