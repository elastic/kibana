/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL } from '../../../common/urls';

const DISCOVER_WITH_FILTER_URL =
  "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now%2Fd,to:now%2Fd))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";
const DISCOVER_WITH_PINNED_FILTER_URL =
  "/app/discover#/?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(),filters:!(),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";

const DATAVIEW = 'audit*';

test.describe('ESS - pinned filters', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, kbnClient, apiServices }) => {
    await apiServices.dataViews.deleteByTitle(DATAVIEW).catch(() => {});
    await kbnClient
      .request({
        method: 'POST',
        path: '/api/data_views/data_view',
        body: { data_view: { title: DATAVIEW, name: DATAVIEW } },
      })
      .catch(() => {});
    await browserAuth.loginAsAdmin();
  });

  test('show pinned filters on security', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(DISCOVER_WITH_PINNED_FILTER_URL);
    const filterItem = page.locator('[id^="popoverFor_filter"]').first();
    await expect(filterItem.locator('.globalFilterItem-isPinned')).toHaveCount(1);
    await pageObjects.explore.openKibanaNavigation();
    await pageObjects.explore.navigateFromKibanaCollapsibleTo('Alerts');
    const alertsFilter = page.locator('[id^="popoverFor_filter"]').first();
    await expect(alertsFilter).toHaveText(/host\.name: test-host/);
  });

  test('does not show discover filters on security', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(DISCOVER_WITH_FILTER_URL);
    const filterItem = page.locator('[id^="popoverFor_filter"]').first();
    await expect(filterItem).toBeVisible();
    await pageObjects.explore.openKibanaNavigation();
    await pageObjects.explore.navigateFromKibanaCollapsibleTo('Alerts');
    await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    const filterAfterNav = page.locator('[id^="popoverFor_filter"]');
    await expect(filterAfterNav.first()).toHaveCount(0);
  });
});

test.describe(
  'SERVERLESS - pinned filters',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects, kbnClient, apiServices }) => {
      await apiServices.dataViews.deleteByTitle(DATAVIEW).catch(() => {});
      await kbnClient
        .request({
          method: 'POST',
          path: '/api/data_views/data_view',
          body: { data_view: { title: DATAVIEW, name: DATAVIEW } },
        })
        .catch(() => {});
      await browserAuth.loginAsAdmin();
    });

    test('show pinned filters on security', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(DISCOVER_WITH_PINNED_FILTER_URL);
      const filterItem = page.locator('[id^="popoverFor_filter"]').first();
      await expect(filterItem.locator('.globalFilterItem-isPinned')).toHaveCount(1);
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-alerts');
      const alertsFilter = page.locator('[id^="popoverFor_filter"]').first();
      await expect(alertsFilter).toHaveText(/host\.name: test-host/);
    });

    test('does not show discover filters on security', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(DISCOVER_WITH_FILTER_URL);
      const filterItem = page.locator('[id^="popoverFor_filter"]').first();
      await expect(filterItem).toBeVisible();
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-alerts');
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
      const filterAfterNav = page.locator('[id^="popoverFor_filter"]');
      await expect(filterAfterNav.first()).toHaveCount(0);
    });
  }
);
