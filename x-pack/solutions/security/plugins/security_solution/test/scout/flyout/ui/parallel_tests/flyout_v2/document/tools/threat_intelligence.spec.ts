/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsClient } from '@kbn/scout-security';
import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const THREAT_INDEX_SETTING = 'securitySolution:defaultThreatIndex';
const INDICATOR_IP = '203.0.113.7';

const indexNames = (spaceId: string) => {
  const suffix = spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return {
    source: `scout-ti-flyout-source-${suffix}`,
    // `endgame-*` is readable by the platform engineer role, who loads the enrichments.
    unlabeled: `endgame-scout-ti-flyout-unlabeled-${suffix}`,
    raw: `endgame-scout-ti-flyout-raw-${suffix}`,
    latest: `endgame-scout-ti-flyout-latest-${suffix}`,
  } as const;
};

const indicatorProperties: Record<string, estypes.MappingProperty> = {
  '@timestamp': { type: 'date' },
  event: { properties: { type: { type: 'keyword' }, id: { type: 'keyword' } } },
  threat: {
    properties: {
      feed: { properties: { name: { type: 'keyword' } } },
      indicator: { properties: { ip: { type: 'ip' }, type: { type: 'keyword' } } },
    },
  },
};

const indicator = (feedName: string, eventId: string, timestamp: string) => ({
  '@timestamp': timestamp,
  event: { type: 'indicator', id: eventId },
  threat: { feed: { name: feedName }, indicator: { ip: INDICATOR_IP, type: 'ipv4-addr' } },
});

const createIndicatorIndex = async (
  esClient: EsClient,
  index: string,
  transformSourceLabel: 'true' | 'false' | undefined,
  documents: Array<Record<string, unknown>>
): Promise<void> => {
  const labels: Record<string, estypes.MappingProperty> = transformSourceLabel
    ? {
        labels: {
          properties: {
            is_ioc_transform_source: { type: 'constant_keyword', value: transformSourceLabel },
          },
        },
      }
    : {};

  await esClient.indices.delete({ index, ignore_unavailable: true });
  await esClient.indices.create({
    index,
    mappings: { properties: { ...indicatorProperties, ...labels } },
  });
  await esClient.bulk({
    index,
    operations: documents.flatMap((document) => [{ index: {} }, document]),
    refresh: 'wait_for',
  });
};

// One indicator from an integration with a latest transform (two raw versions plus the latest
// copy) and one indicator from a feed without the transform label.
const createThreatIntelFixture = async (esClient: EsClient, spaceId: string): Promise<void> => {
  const { source, unlabeled, raw, latest } = indexNames(spaceId);
  const now = Date.now();
  const earlier = new Date(now - 60 * 60 * 1000).toISOString();
  const latestTimestamp = new Date(now - 60 * 1000).toISOString();

  await createIndicatorIndex(esClient, raw, 'true', [
    indicator('Transform feed', 'transform-indicator', earlier),
    indicator('Transform feed', 'transform-indicator', latestTimestamp),
  ]);
  await createIndicatorIndex(esClient, latest, 'false', [
    indicator('Transform feed', 'transform-indicator', latestTimestamp),
  ]);
  await createIndicatorIndex(esClient, unlabeled, undefined, [
    indicator('Custom feed', 'custom-indicator', latestTimestamp),
  ]);

  await esClient.indices.delete({ index: source, ignore_unavailable: true });
  await esClient.index({
    index: source,
    document: {
      '@timestamp': new Date(now).toISOString(),
      source: { ip: INDICATOR_IP },
      host: { name: 'scout-ti-host' },
      event: { kind: 'event' },
    },
    refresh: 'wait_for',
  });
};

spaceTest.describe(
  'Document flyout v2 — Threat intelligence tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // A per-space threat index keeps parallel workers from reading each other's indicators.
      const { unlabeled, raw, latest } = indexNames(scoutSpace.id);
      await scoutSpace.uiSettings.set({ [THREAT_INDEX_SETTING]: [unlabeled, raw, latest] });
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, esClient, scoutSpace }) => {
      await createThreatIntelFixture(esClient, scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [indexNames(scoutSpace.id).source],
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, esClient, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      const { source, unlabeled, raw, latest } = indexNames(scoutSpace.id);
      await esClient.indices.delete({
        index: [source, unlabeled, raw, latest],
        ignore_unavailable: true,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(THREAT_INDEX_SETTING);
    });

    spaceTest(
      'shows each matching indicator once and the insights count matches the tool',
      async ({ pageObjects }) => {
        const { documentFlyout, threatIntelligenceTool } = pageObjects;
        await documentFlyout.openForRule(ruleName);

        await expect(threatIntelligenceTool.enrichedWithThreatIntelligenceCount).toHaveText('2');

        await threatIntelligenceTool.titleLink.click();
        await expect(threatIntelligenceTool.investigationEnrichmentsSection).toBeVisible();
        await expect(threatIntelligenceTool.investigationEnrichments).toHaveCount(2);
      }
    );
  }
);
