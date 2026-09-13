/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import { deleteInboxEpisode, seedInboxEpisode } from '../fixtures/inbox_episode';
import {
  MANAGEMENT_ALERTING_V2_EPISODES_URL_RE,
  MANAGEMENT_ALERTING_V2_RULES_URL_RE,
  MANAGEMENT_ALERTING_V2_URL_RE,
  OBSERVABILITY_ALERTING_INBOX_EPISODE_URL_RE,
  OBSERVABILITY_ALERTING_RULE_DETAILS_URL_RE,
} from '../fixtures/page_objects';

test.describe(
  'Observability Alerting inbox and episode host-aware URLs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ruleId: string;
    let episodeId: string;

    test.beforeAll(async ({ esClient, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      ({ ruleId, episodeId } = await seedInboxEpisode(esClient, kbnClient));
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await deleteInboxEpisode(esClient, kbnClient, { ruleId });
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('View details from the inbox flyout stays on observability alerting', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;

      await test.step('open the seeded episode flyout from the inbox', async () => {
        await alerting.gotoInboxFilteredByRule(ruleId);
        await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
        await expect(alerting.expandRowButton).toHaveCount(1);
        await alerting.openEpisodeFlyout();
      });

      await test.step('Take action View details stays on observability, not management', async () => {
        await alerting.openTakeActionMenu();
        await expect(alerting.viewDetailsLink).not.toHaveAttribute(
          'href',
          MANAGEMENT_ALERTING_V2_URL_RE
        );

        await alerting.clickViewDetails();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_INBOX_EPISODE_URL_RE);
        await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_EPISODES_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/inbox/${episodeId}(/|$|\\?|#)`));
        await expect(alerting.episodeDetailsPage).toBeVisible();
      });
    });

    test('View rule details from the inbox flyout stays on observability alerting', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;

      await test.step('open the seeded episode flyout from the inbox', async () => {
        await alerting.gotoInboxFilteredByRule(ruleId);
        await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
        await expect(alerting.expandRowButton).toHaveCount(1);
        await alerting.openEpisodeFlyout();
      });

      await test.step('View rule details stays on observability, not management', async () => {
        await expect(alerting.viewRuleDetailsLink).toBeVisible({ timeout: 30_000 });
        await expect(alerting.viewRuleDetailsLink).not.toHaveAttribute(
          'href',
          MANAGEMENT_ALERTING_V2_URL_RE
        );

        await alerting.clickViewRuleDetails();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULE_DETAILS_URL_RE);
        await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_RULES_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/rules/v2/${ruleId}(/|$|\\?|#)`));
        await expect(alerting.ruleDetailLayout).toBeVisible();
      });
    });

    test('View rule details from the episode details page stays on observability alerting', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;

      await test.step('open the seeded episode details page', async () => {
        await alerting.gotoEpisodeDetails(episodeId);
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_INBOX_EPISODE_URL_RE);
        await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_EPISODES_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/inbox/${episodeId}(/|$|\\?|#)`));
        await expect(alerting.episodeDetailsPage).toBeVisible();
      });

      await test.step('View rule details stays on observability, not management', async () => {
        await expect(alerting.viewRuleDetailsLink).toBeVisible({ timeout: 30_000 });
        await expect(alerting.viewRuleDetailsLink).not.toHaveAttribute(
          'href',
          MANAGEMENT_ALERTING_V2_URL_RE
        );

        await alerting.clickViewRuleDetails();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULE_DETAILS_URL_RE);
        await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_RULES_URL_RE);
        await expect(page).toHaveURL(new RegExp(`/rules/v2/${ruleId}(/|$|\\?|#)`));
        await expect(alerting.ruleDetailLayout).toBeVisible();
      });
    });
  }
);
