/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { of } from 'rxjs';
import type { ElasticsearchConfig } from '@kbn/core/server';
import { EsLegacyConfigService } from '../../services/es_legacy_config_service';
import { otelHostOnboardingRouteRepository } from './route';

describe('otel_host setup handler', () => {
  const { handler } =
    otelHostOnboardingRouteRepository['POST /internal/observability_onboarding/otel_host/setup'];

  it('returns the configured Elasticsearch host without its credentials', async () => {
    const esLegacyConfigService = new EsLegacyConfigService();
    esLegacyConfigService.setup(
      of({ hosts: ['http://kibana_system:secret@es.internal:9200/prefix'] } as ElasticsearchConfig)
    );
    const fleetStart = {
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
      config: { serverless: { enabled: false } },
      plugins: {
        fleet: { start: jest.fn().mockResolvedValue(fleetStart) },
        observability: { setup: {} },
      },
      kibanaVersion: '9.5.0',
      services: { esLegacyConfigService },
    } as unknown as Parameters<typeof handler>[0]);

    expect(response.elasticsearchUrl).toBe('http://es.internal:9200/prefix');
    expect(JSON.stringify(response)).not.toContain('secret');
  });
});

const hasDataEndpoint = 'GET /internal/observability_onboarding/otel_host/has-data' as const;

describe('otel_host has-data handler', () => {
  const { handler } = otelHostOnboardingRouteRepository[hasDataEndpoint];
  const start = '2026-09-30T10:00:00.000Z';

  const searchFiltersFor = async (query: { start: string; osType?: string }) => {
    const search = jest
      .fn<Promise<estypes.SearchResponse>, [estypes.SearchRequest]>()
      .mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

    await handler({
      params: { query },
      context: {
        core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: { search } } } }),
      },
    } as unknown as Parameters<typeof handler>[0]);

    return search.mock.calls.map(([request]) => request.query?.bool?.filter);
  };

  it('scopes the fresh-data and pre-existing searches to the requested OS through os.type', async () => {
    const filters = await searchFiltersFor({ start, osType: 'darwin' });

    // Pre-existing check, logs probe, metrics probe.
    expect(filters).toHaveLength(3);
    for (const filter of filters) {
      expect(filter).toContainEqual({ term: { 'os.type': 'darwin' } });
    }
  });

  it('sends no OS filter when osType is omitted, as on the legacy otel-logs page', async () => {
    const filters = await searchFiltersFor({ start });

    expect(filters).toHaveLength(3);
    for (const filter of filters) {
      expect(filter).toEqual([{ range: { '@timestamp': expect.any(Object) } }]);
    }
  });
});
