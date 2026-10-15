/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';

const THREAT_INDEX_SETTING = 'securitySolution:defaultThreatIndex';
const FEED_NAME = 'AbuseCH malware';
const INDICATOR_TIMESTAMP = '2021-03-10T14:51:05.766Z';
const RANGE_WITH_INDICATOR = {
  from: '2021-03-01T00:00:00.000Z',
  to: '2021-03-31T23:59:59.999Z',
} as const;
const RANGE_WITHOUT_INDICATOR = {
  from: '2021-07-08T04:00:00.000Z',
  to: '2021-07-09T03:59:59.999Z',
} as const;

// `endgame-*` is in the default Security data view and readable by the platform engineer role.
const indexNames = (spaceId: string) => {
  const suffix = spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return {
    events: `endgame-scout-cti-events-${suffix}`,
    threat: `endgame-scout-cti-threat-${suffix}`,
  } as const;
};

const createIndexWithDocument = async (
  esClient: EsClient,
  index: string,
  properties: Record<string, object>,
  document: Record<string, unknown>
): Promise<void> => {
  await esClient.indices.delete({ index, ignore_unavailable: true });
  await esClient.indices.create({ index, mappings: { properties } });
  await esClient.index({ index, document, refresh: 'wait_for' });
};

const createThreatIndex = (esClient: EsClient, spaceId: string): Promise<void> =>
  createIndexWithDocument(
    esClient,
    indexNames(spaceId).threat,
    {
      '@timestamp': { type: 'date' },
      event: { properties: { dataset: { type: 'keyword' } } },
      threat: { properties: { feed: { properties: { name: { type: 'keyword' } } } } },
    },
    {
      '@timestamp': INDICATOR_TIMESTAMP,
      event: { dataset: 'ti_abusech.malware' },
      threat: { feed: { name: FEED_NAME } },
    }
  );

spaceTest.describe(
  'Overview threat intelligence panel',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ config, scoutSpace }) => {
      // Serverless projects do not support per-space solution views.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('security');
      }
      // A per-space threat index keeps parallel workers from reading each other's indicators.
      await scoutSpace.uiSettings.set({
        [THREAT_INDEX_SETTING]: [indexNames(scoutSpace.id).threat],
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ esClient, scoutSpace }) => {
      const { events, threat } = indexNames(scoutSpace.id);
      await esClient.indices.delete({ index: [events, threat], ignore_unavailable: true });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(THREAT_INDEX_SETTING);
    });

    spaceTest(
      'shows the disabled module when there are no threat intel sources',
      async ({ esClient, scoutSpace, pageObjects }) => {
        // Overview shows an empty prompt until the Security data view matches an index.
        await createIndexWithDocument(
          esClient,
          indexNames(scoutSpace.id).events,
          { '@timestamp': { type: 'date' } },
          { '@timestamp': new Date().toISOString() }
        );

        const { securityOverviewPage } = pageObjects;
        await securityOverviewPage.navigate();

        await expect(securityOverviewPage.threatIntelDisabledCallout).toBeVisible();
        await expect(securityOverviewPage.threatIntelIndicatorCount).toHaveText(
          'Showing: 0 indicators'
        );
        await expect(securityOverviewPage.threatIntelEnableModuleButton).toHaveAttribute(
          'href',
          /\/app\/integrations\/browse\/threat_intel/
        );
      }
    );

    spaceTest(
      'shows zero indicators when the time range has no events',
      async ({ esClient, scoutSpace, pageObjects }) => {
        await createThreatIndex(esClient, scoutSpace.id);

        const { securityOverviewPage } = pageObjects;
        await securityOverviewPage.navigate(RANGE_WITHOUT_INDICATOR);

        await expect(securityOverviewPage.threatIntelDisabledCallout).toBeHidden();
        await expect(securityOverviewPage.threatIntelPanel).toContainText(FEED_NAME);
        await expect(securityOverviewPage.threatIntelIndicatorCount).toHaveText(
          'Showing: 0 indicators'
        );
      }
    );

    spaceTest(
      'lists the feed and counts indicators in the time range',
      async ({ esClient, scoutSpace, pageObjects }) => {
        await createThreatIndex(esClient, scoutSpace.id);

        const { securityOverviewPage } = pageObjects;
        await securityOverviewPage.navigate(RANGE_WITH_INDICATOR);

        await expect(securityOverviewPage.threatIntelPanel).toContainText(FEED_NAME);
        await expect(securityOverviewPage.threatIntelPanel).not.toContainText('Anomali');
        await expect(securityOverviewPage.threatIntelIndicatorCount).toHaveText(
          'Showing: 1 indicator'
        );
      }
    );
  }
);
