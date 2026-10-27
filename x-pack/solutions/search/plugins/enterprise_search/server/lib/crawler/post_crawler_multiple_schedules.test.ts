/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '@kbn/search-connectors';

import type {
  CrawlerCustomScheduleClient,
  CrawlerCustomScheduleMappingClient,
} from '../../../common/types/crawler';

import { fetchCrawlerCustomSchedulingKeysByIndexName } from './fetch_crawler_multiple_schedules';
import { fetchCrawlerDocumentIdByIndexName } from './fetch_crawlers';
import { postCrawlerCustomScheduling } from './post_crawler_multiple_schedules';

jest.mock('./fetch_crawler_multiple_schedules', () => ({
  fetchCrawlerCustomSchedulingKeysByIndexName: jest.fn(),
}));
jest.mock('./fetch_crawlers', () => ({
  fetchCrawlerDocumentIdByIndexName: jest.fn(),
}));

const INDEX_NAME = 'search-crawler';
const CONNECTOR_ID = 'connectorId';

describe('postCrawlerCustomScheduling lib function', () => {
  const mockClient = {
    asCurrentUser: {
      update: jest.fn(),
    },
    asInternalUser: {},
  };
  const client = mockClient as unknown as IScopedClusterClient;

  const schedule = (
    configurationOverrides: CrawlerCustomScheduleClient['configurationOverrides']
  ): CrawlerCustomScheduleMappingClient =>
    new Map([
      [
        'daily-crawl',
        {
          name: 'Daily crawl',
          interval: '0 0 * * *',
          enabled: true,
          configurationOverrides,
        },
      ],
    ]);

  const baseOverrides = {
    maxCrawlDepth: 3,
    sitemapDiscoveryDisabled: false,
    domainAllowlist: ['https://www.elastic.co'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchCrawlerDocumentIdByIndexName as jest.Mock).mockResolvedValue(CONNECTOR_ID);
    (fetchCrawlerCustomSchedulingKeysByIndexName as jest.Mock).mockResolvedValue(['daily-crawl']);
  });

  const lastUpdateCall = () => {
    const { calls } = mockClient.asCurrentUser.update.mock;
    return calls[calls.length - 1][0];
  };

  const scriptUpdateCall = () =>
    mockClient.asCurrentUser.update.mock.calls
      .map(([request]) => request)
      .find((request) => request.script !== undefined);

  it('persists seed_urls when entry points are selected', async () => {
    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({
        ...baseOverrides,
        seedUrls: ['https://www.elastic.co/blog'],
        sitemapUrls: ['https://www.elastic.co/sitemap.xml'],
      })
    );

    expect(lastUpdateCall()).toEqual({
      index: CONNECTORS_INDEX,
      id: CONNECTOR_ID,
      doc: {
        custom_scheduling: {
          'daily-crawl': {
            name: 'Daily crawl',
            interval: '0 0 * * *',
            enabled: true,
            configuration_overrides: {
              max_crawl_depth: 3,
              sitemap_discovery_disabled: false,
              domain_allowlist: ['https://www.elastic.co'],
              seed_urls: ['https://www.elastic.co/blog'],
              sitemap_urls: ['https://www.elastic.co/sitemap.xml'],
            },
          },
        },
      },
    });
  });

  it('omits seed_urls from the persisted document when the client omits seedUrls', async () => {
    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({ ...baseOverrides, sitemapUrls: ['https://www.elastic.co/sitemap.xml'] })
    );

    const { doc } = lastUpdateCall();
    expect(doc.custom_scheduling['daily-crawl'].configuration_overrides).toEqual({
      max_crawl_depth: 3,
      sitemap_discovery_disabled: false,
      domain_allowlist: ['https://www.elastic.co'],
      sitemap_urls: ['https://www.elastic.co/sitemap.xml'],
    });
  });

  it('removes override keys the schedule no longer sets', async () => {
    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({ ...baseOverrides, sitemapUrls: ['https://www.elastic.co/sitemap.xml'] })
    );

    expect(scriptUpdateCall()?.script.params).toEqual({
      deletedScheduleKeys: [],
      staleOverrideKeys: { 'daily-crawl': ['seed_urls'] },
    });
  });

  it('passes schedule keys as script params rather than interpolating them', async () => {
    (fetchCrawlerCustomSchedulingKeysByIndexName as jest.Mock).mockResolvedValue([
      'daily-crawl',
      'weekly-crawl',
    ]);

    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({
        ...baseOverrides,
        seedUrls: ['https://www.elastic.co/blog'],
        sitemapUrls: ['https://www.elastic.co/sitemap.xml'],
      })
    );

    const { script } = scriptUpdateCall();
    expect(script.params.deletedScheduleKeys).toEqual(['weekly-crawl']);
    expect(script.source).not.toContain('weekly-crawl');
  });

  it('leaves custom_scheduling untouched when nothing is stale', async () => {
    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({
        ...baseOverrides,
        seedUrls: ['https://www.elastic.co/blog'],
        sitemapUrls: ['https://www.elastic.co/sitemap.xml'],
      })
    );

    expect(scriptUpdateCall()).toBeUndefined();
    expect(mockClient.asCurrentUser.update).toHaveBeenCalledTimes(1);
  });

  // The crawler writes `last_synced` under each schedule, so the update has to rely on the partial
  // `doc` deep-merge and remove only the override keys it names.
  it('does not touch schedule fields outside configuration_overrides', async () => {
    await postCrawlerCustomScheduling(
      client,
      INDEX_NAME,
      schedule({ ...baseOverrides, sitemapUrls: ['https://www.elastic.co/sitemap.xml'] })
    );

    const { doc } = lastUpdateCall();
    expect(Object.keys(doc)).toEqual(['custom_scheduling']);
    expect(Object.keys(doc.custom_scheduling['daily-crawl'])).toEqual([
      'name',
      'interval',
      'configuration_overrides',
      'enabled',
    ]);

    const { script } = scriptUpdateCall();
    expect(script.source).not.toMatch(/ctx\._source\.custom_scheduling\s*=[^=]/);
    expect(script.params.staleOverrideKeys['daily-crawl']).toEqual(['seed_urls']);
  });
});
