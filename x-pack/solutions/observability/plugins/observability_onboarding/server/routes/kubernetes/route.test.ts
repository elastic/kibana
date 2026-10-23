/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ElasticsearchConfig } from '@kbn/core/server';
import { EsLegacyConfigService } from '../../services/es_legacy_config_service';
import { kubernetesOnboardingRouteRepository } from './route';

describe('kubernetes flow handler', () => {
  const { handler } =
    kubernetesOnboardingRouteRepository['POST /internal/observability_onboarding/kubernetes/flow'];

  it.each(['kubernetes', 'kubernetes_otel'] as const)(
    'returns the configured Elasticsearch host without its credentials for %s',
    async (pkgName) => {
      const esLegacyConfigService = new EsLegacyConfigService();
      esLegacyConfigService.setup(
        of({
          hosts: ['http://kibana_system:secret@es.internal:9200/prefix'],
        } as ElasticsearchConfig)
      );
      const fleetStart = {
        authz: {
          fromRequest: jest.fn().mockResolvedValue({ integrations: { installPackages: true } }),
        },
        packageService: {
          asScoped: jest.fn().mockReturnValue({
            ensureInstalledPackage: jest.fn().mockResolvedValue(undefined),
          }),
        },
        agentService: {
          asInternalUser: {
            getLatestAgentAvailableVersion: jest.fn().mockResolvedValue('9.5.0'),
            getLatestAgentAvailableBaseVersion: jest.fn().mockResolvedValue('9.5.0'),
            getLatestAgentAvailableDockerImageVersion: jest.fn().mockResolvedValue('9.5.0'),
          },
        },
      };

      const response = await handler({
        context: {
          core: Promise.resolve({
            elasticsearch: {
              client: {
                asCurrentUser: {
                  security: {
                    hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: true }),
                    createApiKey: jest.fn().mockResolvedValue({ encoded: 'encoded-api-key' }),
                  },
                },
              },
            },
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(false) },
          }),
        },
        request: {},
        config: { serverless: { enabled: false } },
        params: { body: { pkgName } },
        plugins: {
          fleet: { start: jest.fn().mockResolvedValue(fleetStart) },
          observability: { setup: {} },
        },
        kibanaVersion: '9.5.0',
        services: { esLegacyConfigService },
      } as unknown as Parameters<typeof handler>[0]);

      expect(response.elasticsearchUrl).toBe('http://es.internal:9200/prefix');
      expect(JSON.stringify(response)).not.toContain('secret');
    }
  );
});
