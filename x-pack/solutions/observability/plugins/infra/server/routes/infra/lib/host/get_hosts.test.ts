/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHosts } from './get_hosts';
import type { GetHostParameters } from '../types';

jest.mock('./get_filtered_hosts', () => ({
  getFilteredHostNames: jest.fn(),
}));

jest.mock('./get_apm_hosts', () => ({
  getApmHostNames: jest.fn(),
}));

jest.mock('./get_all_hosts', () => ({
  getAllHosts: jest.fn(),
}));

jest.mock('./get_hosts_alerts_count', () => ({
  getHostsAlertsCount: jest.fn(),
}));

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  assertQueryStructure: jest.fn(),
}));

const { getFilteredHostNames } = jest.requireMock('./get_filtered_hosts');
const { getApmHostNames } = jest.requireMock('./get_apm_hosts');
const { getAllHosts } = jest.requireMock('./get_all_hosts');
const { getHostsAlertsCount } = jest.requireMock('./get_hosts_alerts_count');

const mockInfraMetricsClient = {} as GetHostParameters['infraMetricsClient'];
const mockAlertsClient = {} as GetHostParameters['alertsClient'];
const mockApmDataAccessServices = {
  getDocumentSources: jest.fn().mockResolvedValue([{ source: 'mock' }]),
  getHostNames: jest.fn(),
} as unknown as GetHostParameters['apmDataAccessServices'];

const host = (name: string, metadata: Array<{ name: string; value: string | null }> = []) => ({
  name,
  metadata,
});

const baseParams: GetHostParameters = {
  metrics: [],
  from: 0,
  to: 1000,
  limit: 100,
  query: { bool: { filter: [] } },
  alertsClient: mockAlertsClient,
  apmDataAccessServices: mockApmDataAccessServices,
  infraMetricsClient: mockInfraMetricsClient,
  schema: 'ecs',
};

describe('getHosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllHosts.mockResolvedValue([]);
    getHostsAlertsCount.mockResolvedValue([]);
  });

  describe('host name union', () => {
    it('returns union of infra and APM hosts', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1', 'host-2']);
      getApmHostNames.mockResolvedValue(['host-2', 'host-3']);

      getAllHosts.mockResolvedValue([host('host-1'), host('host-2'), host('host-3')]);

      const result = await getHosts(baseParams);

      expect(result.nodes.map((n) => n.name).sort()).toEqual(['host-1', 'host-2', 'host-3']);
    });

    it('returns empty when no hosts match from either source', async () => {
      getFilteredHostNames.mockResolvedValue([]);
      getApmHostNames.mockResolvedValue([]);

      const result = await getHosts(baseParams);

      expect(result.nodes).toEqual([]);
    });

    it('works without APM data access services', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1']);

      getAllHosts.mockResolvedValue([host('host-1')]);

      const result = await getHosts({ ...baseParams, apmDataAccessServices: undefined });

      expect(result.nodes.map((n) => n.name)).toEqual(['host-1']);
    });
  });

  describe('post-enrichment filtering', () => {
    it('removes hosts whose enriched metadata matches must_not exclusion', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1']);
      getApmHostNames.mockResolvedValue(['host-1', 'apm-only-host']);

      getAllHosts.mockResolvedValue([
        host('host-1', [{ name: 'cloud.provider', value: 'aws' }]),
        host('apm-only-host', [{ name: 'cloud.provider', value: 'gcp' }]),
      ]);

      const result = await getHosts({
        ...baseParams,
        query: {
          bool: {
            must_not: [{ match_phrase: { 'cloud.provider': 'gcp' } }],
          },
        },
      });

      expect(result.nodes.map((n) => n.name)).toEqual(['host-1']);
    });

    it('removes APM-only host enriched with excluded cloud.provider (rnqx scenario)', async () => {
      getFilteredHostNames.mockResolvedValue([]);
      getApmHostNames.mockResolvedValue(['infra-gcp-1', 'infra-gcp-2', 'rnqx']);

      getAllHosts.mockResolvedValue([
        host('infra-gcp-1', [{ name: 'cloud.provider', value: 'gcp' }]),
        host('infra-gcp-2', [{ name: 'cloud.provider', value: 'gcp' }]),
        host('rnqx', [{ name: 'cloud.provider', value: 'gcp' }]),
      ]);

      const result = await getHosts({
        ...baseParams,
        query: {
          bool: {
            must_not: [{ match_phrase: { 'cloud.provider': 'gcp' } }],
          },
        },
      });

      expect(result.nodes).toEqual([]);
    });

    it('keeps hosts with null metadata value even when field is excluded', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1']);
      getApmHostNames.mockResolvedValue(['host-1', 'apm-only']);

      getAllHosts.mockResolvedValue([
        host('host-1', [{ name: 'cloud.provider', value: 'aws' }]),
        host('apm-only', [{ name: 'cloud.provider', value: null }]),
      ]);

      const result = await getHosts({
        ...baseParams,
        query: {
          bool: {
            must_not: [{ match_phrase: { 'cloud.provider': 'gcp' } }],
          },
        },
      });

      expect(result.nodes.map((n) => n.name).sort()).toEqual(['apm-only', 'host-1']);
    });

    it('does not filter when query has no must_not clauses', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1']);
      getApmHostNames.mockResolvedValue(['host-1', 'host-2']);

      getAllHosts.mockResolvedValue([
        host('host-1', [{ name: 'cloud.provider', value: 'gcp' }]),
        host('host-2', [{ name: 'cloud.provider', value: 'gcp' }]),
      ]);

      const result = await getHosts(baseParams);

      expect(result.nodes.map((n) => n.name).sort()).toEqual(['host-1', 'host-2']);
    });

    it('does not filter on non-metadata fields', async () => {
      getFilteredHostNames.mockResolvedValue(['host-1']);
      getApmHostNames.mockResolvedValue(['host-1']);

      getAllHosts.mockResolvedValue([host('host-1', [{ name: 'cloud.provider', value: 'gcp' }])]);

      const result = await getHosts({
        ...baseParams,
        query: {
          bool: {
            must_not: [{ match_phrase: { 'service.name': 'my-service' } }],
          },
        },
      });

      expect(result.nodes.map((n) => n.name)).toEqual(['host-1']);
    });
  });
});
