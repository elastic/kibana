/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

const ABSOLUTE_DATE_RANGE = {
  url: '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),valueReport:(linkTo:!(),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))',
  urlFiltersHostsHosts:
    '/app/security/hosts/allHosts?filters=!((%27$state%27:(store:globalState),meta:(alias:!n,disabled:!f,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:(query:test-host)))),(%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,key:host.os.name,negate:!f,params:(query:test-os),type:phrase),query:(match_phrase:(host.os.name:(query:test-os)))))',
  urlKqlNetworkNetwork: `/app/security/network/flows/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlHostsHosts: `/app/security/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
};

const ABSOLUTE_DATE = {
  endTime: 'Aug 1, 2019 @ 20:33:29.186',
  startTime: 'Aug 1, 2019 @ 20:03:29.186',
};

test.describe('url state', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('sets filters from the url', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlFiltersHostsHosts);
    const filter0 = page.locator('[id^="popoverFor_filter"]').first();
    await expect(filter0).toHaveText(/host\.name: test-host/);
    await expect(filter0.locator('.globalFilterItem-isPinned')).toHaveCount(1);
    const filter1 = page.locator('[id^="popoverFor_filter"]').nth(1);
    await expect(filter1).toHaveText(/host\.os\.name: test-os/);
  });

  test('sets the global start and end dates from the url', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.url);
    const startDateBtn = page.testSubj.locator('superDatePickerstartDatePopoverButton');
    await expect(startDateBtn.first()).toHaveAttribute('title', ABSOLUTE_DATE.startTime);
    const endDateBtn = page.testSubj.locator('superDatePickerendDatePopoverButton');
    await expect(endDateBtn.first()).toHaveAttribute('title', ABSOLUTE_DATE.endTime);
  });

  test('sets kql on network page', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    const kqlInput = page.testSubj.locator('queryInput');
    await expect(kqlInput.first()).toHaveText('source.ip: "10.142.0.9"');
  });

  test('sets kql on hosts page', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    const kqlInput = page.testSubj.locator('queryInput');
    await expect(kqlInput.first()).toHaveText('source.ip: "10.142.0.9"');
  });

  test('sets the url state when kql is set', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoWithTimeRange(ABSOLUTE_DATE_RANGE.url);
    const kqlInput = page.testSubj.locator('queryInput').first();
    await kqlInput.fill('source.ip: "10.142.0.9" ');
    await kqlInput.press('Enter');
    await expect(page).toHaveURL(
      /query=\(language:kuery,query:%27source\.ip:%20%2210\.142\.0\.9%22%20%27\)/
    );
  });

  test('Do not clears kql when navigating to a new page', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-network');
    await expect(page).toHaveURL(/network/);
    const kqlInput = page.testSubj.locator('queryInput').first();
    await expect(kqlInput).toHaveText('source.ip: "10.142.0.9"');
  });

  test('sets saved query from the url', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlFiltersHostsHosts);
    const saveQueryBtn = page.testSubj.locator('saved-query-popover-save-button');
    await saveQueryBtn.first().click();
    const nameInput = page.getByRole('textbox', { name: /name/i });
    await nameInput.fill('test-query');
    await page.testSubj.locator('saved-query-popover-save-button').first().click();
    await page.reload();
    const filter0 = page.locator('[id^="popoverFor_filter"]').first();
    await expect(filter0).toHaveText(/host\.name: test-host/);
    await expect(filter0.locator('.globalFilterItem-isPinned')).toHaveCount(1);
    const filter1 = page.locator('[id^="popoverFor_filter"]').nth(1);
    await expect(filter1).toHaveText(/host\.os\.name: test-os/);
  });

  test('sets the url state when start and end date are set', async ({ pageObjects, page }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.url);
    const startDateBtn = page.testSubj.locator('superDatePickerstartDatePopoverButton');
    await expect(startDateBtn).toHaveAttribute('title', ABSOLUTE_DATE.startTime);
    const endDateBtn = page.testSubj.locator('superDatePickerendDatePopoverButton');
    await expect(endDateBtn).toHaveAttribute('title', ABSOLUTE_DATE.endTime);
  });

  test('sets the timeline start and end dates from the url when locked to global time', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.url);
    const startDateBtn = page.testSubj.locator('superDatePickerstartDatePopoverButton');
    await expect(startDateBtn).toHaveAttribute('title', ABSOLUTE_DATE.startTime);
  });

  test('sets the timeline start and end dates independently when times are unlocked', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.url);
    const startDateBtn = page.testSubj.locator('superDatePickerstartDatePopoverButton');
    await expect(startDateBtn).toBeVisible();
  });

  test('sets the url state when timeline/global date pickers are unlinked', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.url);
    await expect(page).toHaveURL(/timerange/);
  });

  test('sets the url state when kql is set and check if href reflect this change', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.explore.gotoWithTimeRange(ABSOLUTE_DATE_RANGE.url);
    const kqlInput = page.testSubj.locator('queryInput');
    await kqlInput.fill('source.ip: "10.142.0.9" ');
    await kqlInput.press('Enter');
    await expect(page).toHaveURL(/query/);
  });

  test('sets KQL in host page and detail page and check if href match', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    const kqlInput = page.testSubj.locator('queryInput');
    await expect(kqlInput).toHaveText('source.ip: "10.142.0.9"');
    await expect(page).toHaveURL(/hosts/);
  });

  test('sets and reads the url state for timeline by id', async ({
    pageObjects,
    page,
    kbnClient,
  }) => {
    const { createTimeline, deleteTimelines } = await import(
      '../../../common/timeline_api_helpers'
    );
    await deleteTimelines(kbnClient);
    const timelineResp = await createTimeline(kbnClient, {
      title: 'URL State Timeline',
      description: 'Test timeline for URL state',
      query: 'host.name: *',
    });

    await pageObjects.explore.gotoUrl(
      `/app/security/timelines?timeline=(id:'${timelineResp.savedObjectId}',isOpen:!t)`
    );
    await expect(page).toHaveURL(new RegExp(timelineResp.savedObjectId));
  });
});
