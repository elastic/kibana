/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, SecurityApiServicesFixture } from '@kbn/scout-security';
import { spaceTest, tags, CUSTOM_QUERY_RULE, THREAT_INDICATOR_IP } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const THREAT_INDEX_SETTING = 'securitySolution:defaultThreatIndex';

const indexNames = (spaceId: string) => {
  const suffix = spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return {
    source: `scout-ti-flyout-source-${suffix}`,
    // `endgame-*` is readable by the platform engineer role, who loads the enrichments.
    unlabeled: `endgame-scout-ti-flyout-unlabeled-${suffix}`,
    raw: `endgame-scout-ti-flyout-raw-${suffix}`,
    latest: `endgame-scout-ti-flyout-latest-${suffix}`,
    altLabelRaw: `endgame-scout-ti-flyout-alt-raw-${suffix}`,
    altLabelLatest: `endgame-scout-ti-flyout-alt-latest-${suffix}`,
  } as const;
};

// One indicator from each of two integrations with a latest transform (two raw versions plus the
// latest copy), one per transform label, and one indicator from a feed without a transform label.
const createThreatIntelFixture = async (
  esClient: EsClient,
  { threatIntelligence }: SecurityApiServicesFixture,
  spaceId: string
): Promise<void> => {
  const { source, unlabeled, raw, latest, altLabelRaw, altLabelLatest } = indexNames(spaceId);
  const now = Date.now();
  const previousTimestamp = new Date(now - 60 * 60 * 1000).toISOString();
  const latestTimestamp = new Date(now - 60 * 1000).toISOString();

  await threatIntelligence.createTransformIndicators({
    label: 'is_ioc_transform_source',
    feedName: 'Transform feed',
    dataset: 'ti_abusech.malware',
    rawIndex: raw,
    latestIndex: latest,
    previousTimestamp,
    latestTimestamp,
  });
  await threatIntelligence.createTransformIndicators({
    label: 'is_transform_source',
    feedName: 'Alternate label transform feed',
    dataset: 'ti_flashpoint.indicator',
    rawIndex: altLabelRaw,
    latestIndex: altLabelLatest,
    previousTimestamp,
    latestTimestamp,
  });
  await threatIntelligence.createIndicators(unlabeled, [
    { feedName: 'Custom feed', dataset: 'ti_custom.indicator', timestamp: latestTimestamp },
  ]);

  await esClient.indices.delete({ index: source, ignore_unavailable: true });
  await esClient.index({
    index: source,
    document: {
      '@timestamp': new Date(now).toISOString(),
      source: { ip: THREAT_INDICATOR_IP },
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
      const { unlabeled, raw, latest, altLabelRaw, altLabelLatest } = indexNames(scoutSpace.id);
      await scoutSpace.uiSettings.set({
        [THREAT_INDEX_SETTING]: [unlabeled, raw, latest, altLabelRaw, altLabelLatest],
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, esClient, scoutSpace }) => {
      await createThreatIntelFixture(esClient, apiServices, scoutSpace.id);

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
      const { source, unlabeled, raw, latest, altLabelRaw, altLabelLatest } = indexNames(
        scoutSpace.id
      );
      await esClient.indices.delete({
        index: [source, unlabeled, raw, latest, altLabelRaw, altLabelLatest],
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

        await expect(threatIntelligenceTool.enrichedWithThreatIntelligenceCount).toHaveText('3');

        await threatIntelligenceTool.titleLink.click();
        await expect(threatIntelligenceTool.investigationEnrichmentsSection).toBeVisible();
        await expect(threatIntelligenceTool.investigationEnrichments).toHaveCount(3);
      }
    );
  }
);
