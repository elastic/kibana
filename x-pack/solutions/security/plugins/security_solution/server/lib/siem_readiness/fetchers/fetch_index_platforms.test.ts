/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { fetchIndexPlatforms } from './fetch_index_platforms';

const logger = {
  warn: jest.fn(),
} as unknown as Logger;

interface IndexBucketInput {
  index: string;
  cloudProvider?: string;
  cloudAccountId?: string;
  hostOsFamily?: string;
  eventModule?: string;
  observerVendor?: string;
}

const makeBucket = ({
  index,
  cloudProvider,
  cloudAccountId,
  hostOsFamily,
  eventModule,
  observerVendor,
}: IndexBucketInput) => ({
  key: index,
  doc_count: 100,
  cloud_provider: {
    buckets: cloudProvider ? [{ key: cloudProvider, doc_count: 100 }] : [],
  },
  cloud_account_id: {
    buckets: cloudAccountId ? [{ key: cloudAccountId, doc_count: 100 }] : [],
  },
  host_os_family: {
    buckets: hostOsFamily ? [{ key: hostOsFamily, doc_count: 100 }] : [],
  },
  event_module: {
    buckets: eventModule ? [{ key: eventModule, doc_count: 100 }] : [],
  },
  observer_vendor: {
    buckets: observerVendor ? [{ key: observerVendor, doc_count: 100 }] : [],
  },
});

const makeEsClient = (buckets: IndexBucketInput[]): ElasticsearchClient =>
  ({
    search: jest.fn().mockResolvedValue({
      aggregations: {
        by_index: {
          buckets: buckets.map(makeBucket),
        },
      },
    }),
  } as unknown as ElasticsearchClient);

describe('fetchIndexPlatforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes vendor + OS for endpoint data with event.module', async () => {
    const index = '.ds-logs-crowdstrike.fdr-default-2026.01.01-000001';
    const dataStream = 'logs-crowdstrike.fdr-default';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'windows',
        eventModule: 'crowdstrike',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Crowdstrike (Windows)');
    expect(result.get(dataStream)).toBe('Crowdstrike (Windows)');
  });

  it('composes vendor + OS for Elastic Defend endpoint data', async () => {
    const index = '.ds-logs-endpoint.events.process-default-2026.01.01-000001';
    const dataStream = 'logs-endpoint.events.process-default';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'windows',
        eventModule: 'endpoint',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Endpoint (Windows)');
    expect(result.get(dataStream)).toBe('Endpoint (Windows)');
  });

  it('title-cases unknown modules in vendor + OS composition', async () => {
    const index = '.ds-logs-foobar.events-default-2026.01.01-000001';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'windows',
        eventModule: 'foobar',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Foobar (Windows)');
  });

  it('composes vendor + OS for sentinel_one with macos', async () => {
    const index = '.ds-logs-sentinel_one.activity-default-2026.01.01-000001';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'macos',
        eventModule: 'sentinel_one',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Sentinel One (Macos)');
  });

  it('falls back to OS Endpoints when no vendor field is present', async () => {
    const index = 'custom-windows-endpoints-index';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'windows',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Windows Endpoints');
  });

  it('derives vendor from data stream package name when ECS vendor fields are absent', async () => {
    const index = '.ds-logs-crowdstrike.fdr-default-2026.01.01-000001';
    const dataStream = 'logs-crowdstrike.fdr-default';
    const esClient = makeEsClient([
      {
        index,
        hostOsFamily: 'windows',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Crowdstrike (Windows)');
    expect(result.get(dataStream)).toBe('Crowdstrike (Windows)');
  });

  it('keeps cloud provider + account labels unchanged', async () => {
    const index = '.ds-logs-aws.cloudtrail-default-2026.01.01-000001';
    const esClient = makeEsClient([
      {
        index,
        cloudProvider: 'aws',
        cloudAccountId: '123456',
        hostOsFamily: 'windows',
        eventModule: 'crowdstrike',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('AWS account 123456');
  });

  it('keeps cloud provider-only labels unchanged', async () => {
    const index = '.ds-logs-aws.cloudtrail-default-2026.01.01-000001';
    const esClient = makeEsClient([
      {
        index,
        cloudProvider: 'aws',
        hostOsFamily: 'windows',
        eventModule: 'crowdstrike',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('AWS');
  });

  it('returns title-cased vendor when OS is absent', async () => {
    const index = 'logs-okta.system-default';
    const esClient = makeEsClient([
      {
        index,
        eventModule: 'okta',
      },
    ]);

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.get(index)).toBe('Okta');
  });

  it('returns an empty map and logs when the aggregation fails', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('search failed')),
    } as unknown as ElasticsearchClient;

    const result = await fetchIndexPlatforms({ esClient, logger });

    expect(result.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('fetchIndexPlatforms: aggregation failed')
    );
  });
});
