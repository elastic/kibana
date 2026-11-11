/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The new Entity Analytics home page end to end: it loads, and a Needs attention tile filters the
 * entities grid. The counts themselves are covered by the Jest integration tests. Sequential, as
 * the new page is behind a server-wide feature flag that parallel suites must not see.
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/ui/tests/new_home_page.spec.ts
 */

import { randomUUID } from 'crypto';
import { test, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';

const NEW_HOME_PAGE_FLAG = 'securitySolution.useNewEntityAnalyticsPage';

// Run-unique, so a leftover from an interrupted run can't leave two docs for the same entity.
const RUN_ID = randomUUID().slice(0, 8);
// A risk score and a first seen time of now make this host count on the New entity tile.
const NEW_RISKY_HOST = `scout-new-risky-host-${RUN_ID}`;
// No risk score, so not on the tile.
const OTHER_HOST = `scout-other-host-${RUN_ID}`;
// Narrows the grid to this suite's hosts, so other entities on a shared deployment can't push them
// out of the rendered rows.
const SEEDED_HOSTS_QUERY = `entity.name: "${NEW_RISKY_HOST}" or entity.name: "${OTHER_HOST}"`;

test.describe('Entity analytics new home page', { tag: [...tags.stateful.classic] }, () => {
  // Another suite may already run the host engine: then this suite only removes its own entities.
  let installedHostEngine = false;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [NEW_HOME_PAGE_FLAG]: true },
    });
    const { engines } = await apiServices.entityAnalytics.getEntityStoreStatus();
    installedHostEngine = !engines.some(({ type }) => type === 'host');
    await apiServices.entityAnalytics.installEntityStoreV2(['host']);
    await apiServices.entityAnalytics.indexEntityStoreEntry(
      `host:${NEW_RISKY_HOST}`,
      NEW_RISKY_HOST,
      { risk: { score: 80, level: 'High' } }
    );
    await apiServices.entityAnalytics.indexEntityStoreEntry(`host:${OTHER_HOST}`, OTHER_HOST);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsT1Analyst();
    await pageObjects.entityAnalyticsHomePage.goto();
    await pageObjects.queryBar.setQuery(SEEDED_HOSTS_QUERY);
    await pageObjects.queryBar.submitQuery();
  });

  test.afterAll(async ({ apiServices }) => {
    if (installedHostEngine) {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
    } else {
      await apiServices.entityAnalytics.deleteEntityStoreEntries([
        `host:${NEW_RISKY_HOST}`,
        `host:${OTHER_HOST}`,
      ]);
    }
    await apiServices.core.settings({
      'feature_flags.overrides': { [NEW_HOME_PAGE_FLAG]: null },
    });
  });

  test('loads with the six tiles and the entities grid', async ({ pageObjects }) => {
    const { entityAnalyticsHomePage } = pageObjects;

    for (const id of SIGNAL_CARD_IDS) {
      await expect(entityAnalyticsHomePage.tile(id)).toBeVisible();
    }
    await expect(entityAnalyticsHomePage.gridRow(NEW_RISKY_HOST)).toBeVisible();
    await expect(entityAnalyticsHomePage.gridRow(OTHER_HOST)).toBeVisible();
  });

  test('a tile filters the grid to its entities, and a second click clears it', async ({
    pageObjects,
  }) => {
    const { entityAnalyticsHomePage } = pageObjects;
    const newEntityTile = entityAnalyticsHomePage.tile('newEntity');

    await test.step('the tile has entities, so it can be clicked', async () => {
      await expect(newEntityTile).toHaveAttribute('aria-pressed', 'false');
      await expect(entityAnalyticsHomePage.gridRow(OTHER_HOST)).toBeVisible();
    });

    await test.step('selecting it keeps only its entities in the grid', async () => {
      await entityAnalyticsHomePage.toggleTile('newEntity', { selected: true });
      await expect(entityAnalyticsHomePage.gridRow(OTHER_HOST)).toBeHidden();
      await expect(entityAnalyticsHomePage.gridRow(NEW_RISKY_HOST)).toBeVisible();
    });

    await test.step('selecting it again brings every entity back', async () => {
      await entityAnalyticsHomePage.toggleTile('newEntity', { selected: false });
      await expect(entityAnalyticsHomePage.gridRow(OTHER_HOST)).toBeVisible();
      await expect(entityAnalyticsHomePage.gridRow(NEW_RISKY_HOST)).toBeVisible();
    });
  });
});
