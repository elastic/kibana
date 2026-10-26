/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ElasticsearchConfig } from '@kbn/core/server';
import { apiEndpointsRouteRepository, hasManagedElasticsearchBulkEndpoint } from './route';
import { EsLegacyConfigService } from '../../services/es_legacy_config_service';

jest.mock('../../lib/get_managed_otlp_service_url', () => ({
  getManagedOtlpServiceUrl: jest.fn().mockReturnValue('https://otlp.example.com:443'),
}));

describe('hasManagedElasticsearchBulkEndpoint', () => {
  it('uses managed URL presence as the Elasticsearch-compatible bulk endpoint availability signal', () => {
    expect(hasManagedElasticsearchBulkEndpoint('https://otlp.example.com:443')).toBe(true);
  });

  it('treats missing or blank managed URLs as unavailable', () => {
    expect(hasManagedElasticsearchBulkEndpoint(undefined)).toBe(false);
    expect(hasManagedElasticsearchBulkEndpoint('   ')).toBe(false);
  });
});

describe('api_endpoints handler', () => {
  const { handler } =
    apiEndpointsRouteRepository['GET /internal/observability_onboarding/api_endpoints'];

  const esLegacyConfigService = new EsLegacyConfigService();
  esLegacyConfigService.setup(
    of({ hosts: ['http://kibana_system:secret@es.internal:9200/prefix'] } as ElasticsearchConfig)
  );

  const createResources = ({ hasAllRequested }: { hasAllRequested: boolean }) =>
    ({
      context: {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: {
                security: {
                  hasPrivileges: jest
                    .fn()
                    .mockResolvedValue({ has_all_requested: hasAllRequested }),
                },
              },
            },
          },
        }),
      },
      plugins: {},
      services: { esLegacyConfigService },
    } as unknown as Parameters<typeof handler>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a user without ingest privileges with 403 before reading the Elasticsearch hosts', async () => {
    const readConfig = jest.spyOn(esLegacyConfigService, 'readConfig');

    await expect(handler(createResources({ hasAllRequested: false }))).rejects.toMatchObject({
      output: { statusCode: 403 },
    });

    expect(readConfig).not.toHaveBeenCalled();
  });

  it('returns the configured Elasticsearch host without its credentials', async () => {
    const response = await handler(createResources({ hasAllRequested: true }));

    expect(response).toEqual({
      elasticsearchUrl: 'http://es.internal:9200/prefix',
      managedOtlpServiceUrl: 'https://otlp.example.com:443',
    });
    expect(JSON.stringify(response)).not.toContain('secret');
  });
});
