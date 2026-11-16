/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

/** IP address held in `threat.indicator.ip` by every indicator this service indexes. */
export const THREAT_INDICATOR_IP = '203.0.113.7' as const;

/** The two labels integrations use to mark raw copies (`"true"`) and latest copies (`"false"`). */
export type TransformSourceLabel = 'is_ioc_transform_source' | 'is_transform_source';

export interface ThreatIndicator {
  feedName: string;
  dataset: string;
  timestamp: string;
}

export interface TransformIndicatorFeed {
  label: TransformSourceLabel;
  feedName: string;
  dataset: string;
  rawIndex: string;
  latestIndex: string;
  /** When the integration ingested the indicator's previous version. */
  previousTimestamp: string;
  /** When the integration ingested the indicator's latest version, which the transform copies. */
  latestTimestamp: string;
}

export interface ThreatIntelligenceApiService {
  /**
   * Indexes indicators into an index without a transform source label, like a feed without a
   * latest transform or a custom indicator index. Recreates the index if it exists.
   */
  createIndicators: (index: string, indicators: readonly ThreatIndicator[]) => Promise<void>;
  /**
   * Mirrors one indicator from an integration with a latest transform: both ingested versions go
   * to `rawIndex`, labeled `"true"`, and the transform's copy of the latest version goes to
   * `latestIndex`, labeled `"false"`. Recreates both indices if they exist.
   */
  createTransformIndicators: (feed: TransformIndicatorFeed) => Promise<void>;
}

const indicatorProperties: Record<string, estypes.MappingProperty> = {
  '@timestamp': { type: 'date' },
  event: { properties: { type: { type: 'keyword' }, dataset: { type: 'keyword' } } },
  threat: {
    properties: {
      feed: { properties: { name: { type: 'keyword' } } },
      indicator: { properties: { ip: { type: 'ip' }, type: { type: 'keyword' } } },
    },
  },
};

const toIndicatorDocument = ({ feedName, dataset, timestamp }: ThreatIndicator) => ({
  '@timestamp': timestamp,
  event: { type: 'indicator', dataset },
  threat: { feed: { name: feedName }, indicator: { ip: THREAT_INDICATOR_IP, type: 'ipv4-addr' } },
});

const createIndicatorIndex = async (
  esClient: EsClient,
  index: string,
  indicators: readonly ThreatIndicator[],
  transformSource?: { label: TransformSourceLabel; value: 'true' | 'false' }
): Promise<void> => {
  // Like the integrations' index templates, a `constant_keyword` mapping labels every document.
  const labelProperties: Record<string, estypes.MappingProperty> = transformSource
    ? {
        labels: {
          properties: {
            [transformSource.label]: { type: 'constant_keyword', value: transformSource.value },
          },
        },
      }
    : {};

  await esClient.indices.delete({ index, ignore_unavailable: true });
  await esClient.indices.create({
    index,
    mappings: { properties: { ...indicatorProperties, ...labelProperties } },
  });
  await esClient.bulk({
    index,
    operations: indicators.flatMap((indicator) => [{ index: {} }, toIndicatorDocument(indicator)]),
    refresh: 'wait_for',
  });
};

export const getThreatIntelligenceApiService = ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ScoutLogger;
}): ThreatIntelligenceApiService => ({
  createIndicators: async (index, indicators) => {
    await measurePerformanceAsync(log, 'security.threatIntelligence.createIndicators', () =>
      createIndicatorIndex(esClient, index, indicators)
    );
  },

  createTransformIndicators: async ({
    label,
    feedName,
    dataset,
    rawIndex,
    latestIndex,
    previousTimestamp,
    latestTimestamp,
  }) => {
    await measurePerformanceAsync(
      log,
      'security.threatIntelligence.createTransformIndicators',
      async () => {
        await createIndicatorIndex(
          esClient,
          rawIndex,
          [
            { feedName, dataset, timestamp: previousTimestamp },
            { feedName, dataset, timestamp: latestTimestamp },
          ],
          { label, value: 'true' }
        );
        await createIndicatorIndex(
          esClient,
          latestIndex,
          [{ feedName, dataset, timestamp: latestTimestamp }],
          { label, value: 'false' }
        );
      }
    );
  },
});
