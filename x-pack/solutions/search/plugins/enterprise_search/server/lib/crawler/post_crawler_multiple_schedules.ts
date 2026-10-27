/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '@kbn/search-connectors';

import type {
  CrawlerCustomScheduleConfigOverridesClient,
  CrawlerCustomScheduleConfigOverridesServer,
  CrawlerCustomScheduleMappingServer,
  CrawlerCustomScheduleMappingClient,
  CrawlerCustomScheduleServer,
} from '../../../common/types/crawler';

import { fetchCrawlerCustomSchedulingKeysByIndexName } from './fetch_crawler_multiple_schedules';
import { fetchCrawlerDocumentIdByIndexName } from './fetch_crawlers';

const CONFIGURATION_OVERRIDE_KEYS: ReadonlyArray<keyof CrawlerCustomScheduleConfigOverridesServer> =
  [
    'max_crawl_depth',
    'sitemap_discovery_disabled',
    'domain_allowlist',
    'sitemap_urls',
    'seed_urls',
  ];

// Removes schedules the client dropped, plus any override a schedule no longer sets. The partial
// `doc` update below deep-merges, so a cleared override would otherwise keep its stored value.
// `last_synced` is written by the crawler under each schedule and must survive this, hence the
// targeted removals rather than replacing `custom_scheduling` wholesale.
const REMOVE_STALE_ENTRIES_SCRIPT = `
  if (ctx._source.custom_scheduling == null) {
    return;
  }
  for (def scheduleKey : params.deletedScheduleKeys) {
    ctx._source.custom_scheduling.remove(scheduleKey);
  }
  for (def entry : params.staleOverrideKeys.entrySet()) {
    def schedule = ctx._source.custom_scheduling.get(entry.getKey());
    if (schedule == null) {
      continue;
    }
    def overrides = schedule.get('configuration_overrides');
    if (overrides == null) {
      continue;
    }
    for (def overrideKey : entry.getValue()) {
      overrides.remove(overrideKey);
    }
  }
`;

const convertConfigOverridesClientToServer = (
  configurationOverrides: CrawlerCustomScheduleConfigOverridesClient
): CrawlerCustomScheduleConfigOverridesServer => {
  const { maxCrawlDepth, sitemapDiscoveryDisabled, domainAllowlist, sitemapUrls, seedUrls } =
    configurationOverrides;

  return {
    ...(maxCrawlDepth !== undefined && { max_crawl_depth: maxCrawlDepth }),
    ...(sitemapDiscoveryDisabled !== undefined && {
      sitemap_discovery_disabled: sitemapDiscoveryDisabled,
    }),
    ...(domainAllowlist !== undefined && { domain_allowlist: domainAllowlist }),
    ...(sitemapUrls !== undefined && { sitemap_urls: sitemapUrls }),
    ...(seedUrls !== undefined && { seed_urls: seedUrls }),
  };
};

const convertCustomScheduleMappingClientToServer = (
  customSchedules: CrawlerCustomScheduleMappingClient
): CrawlerCustomScheduleMappingServer =>
  new Map(
    Array.from(
      customSchedules,
      ([scheduleName, { name, interval, configurationOverrides, enabled }]): [
        string,
        CrawlerCustomScheduleServer
      ] => [
        scheduleName,
        {
          name,
          interval,
          configuration_overrides: convertConfigOverridesClientToServer(configurationOverrides),
          enabled,
        },
      ]
    )
  );

const collectStaleOverrideKeys = (
  customSchedules: CrawlerCustomScheduleMappingServer
): Record<string, string[]> => {
  const staleOverrideKeys: Record<string, string[]> = {};

  customSchedules.forEach(({ configuration_overrides: configurationOverrides }, scheduleKey) => {
    const unsetKeys = CONFIGURATION_OVERRIDE_KEYS.filter(
      (overrideKey) => configurationOverrides[overrideKey] === undefined
    );
    if (unsetKeys.length > 0) {
      staleOverrideKeys[scheduleKey] = unsetKeys;
    }
  });

  return staleOverrideKeys;
};

export const postCrawlerCustomScheduling = async (
  client: IScopedClusterClient,
  indexName: string,
  customSchedules: CrawlerCustomScheduleMappingClient
): Promise<UpdateResponse> => {
  const connectorId = await fetchCrawlerDocumentIdByIndexName(client, indexName);
  const customSchedulingPayload = convertCustomScheduleMappingClientToServer(customSchedules);

  const existingCustomScheduleKeys = await fetchCrawlerCustomSchedulingKeysByIndexName(
    client,
    indexName
  );
  const newCustomScheduleKeys = Array.from(customSchedulingPayload.keys());
  const deletedScheduleKeys = existingCustomScheduleKeys.filter(
    (key) => !newCustomScheduleKeys.includes(key)
  );
  const staleOverrideKeys = collectStaleOverrideKeys(customSchedulingPayload);

  if (deletedScheduleKeys.length > 0 || Object.keys(staleOverrideKeys).length > 0) {
    await client.asCurrentUser.update({
      index: CONNECTORS_INDEX,
      id: connectorId,
      script: {
        source: REMOVE_STALE_ENTRIES_SCRIPT,
        params: { deletedScheduleKeys, staleOverrideKeys },
      },
    });
  }

  return await client.asCurrentUser.update({
    index: CONNECTORS_INDEX,
    id: connectorId,
    doc: {
      custom_scheduling: Object.fromEntries(customSchedulingPayload),
    },
  });
};
