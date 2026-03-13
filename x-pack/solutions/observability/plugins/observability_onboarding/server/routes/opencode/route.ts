/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Boom from '@hapi/boom';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl, getKibanaUrl } from '../../lib/get_fallback_urls';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';

function interpolateEnvVars(text: string): string {
  return text.replace(/\$\{(\w+)\}/g, (_, varName) => process.env[varName] ?? '');
}

const setupFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/opencode/setup',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  async handler(resources): Promise<{
    elasticsearchUrl: string;
    kibanaUrl: string;
    apiKeyEncoded: string;
    provider: Record<string, unknown>;
  }> {
    const {
      context,
      plugins,
      core,
      services: { esLegacyConfigService },
    } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Insufficient permissions to create API key');
    }

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);

    const timestamp = new Date().toISOString();
    const { encoded: apiKeyEncoded } = await client.asCurrentUser.security.createApiKey({
      name: `opencode-${timestamp}`,
      metadata: {
        managed: true,
        application: 'opencode',
      },
      role_descriptors: {
        opencode_full: {
          cluster: ['all'],
          indices: [
            {
              names: ['*'],
              privileges: ['all'],
            },
          ],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['space_all'],
              resources: ['*'],
            },
          ],
        },
      },
    });

    const providerConfigPath = resolve(process.cwd(), 'config', 'opencode-provider.json');
    const providerRaw = await readFile(providerConfigPath, 'utf-8');
    const provider = JSON.parse(interpolateEnvVars(providerRaw)) as Record<string, unknown>;

    return {
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      kibanaUrl,
      apiKeyEncoded,
      provider,
    };
  },
});

export const opencodeOnboardingRouteRepository = {
  ...setupFlowRoute,
};
