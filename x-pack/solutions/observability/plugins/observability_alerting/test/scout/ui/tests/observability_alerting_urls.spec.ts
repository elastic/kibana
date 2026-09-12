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
import {
  OBSERVABILITY_ALERTING_SURFACES,
  OBSERVABILITY_ALERTING_RULES_V1_URL_RE,
  OBSERVABILITY_ALERTING_RULES_V2_URL_RE,
} from '../fixtures/page_objects';
import {
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../../../public/constants';

/*
 * Lives under the default Scout config (`test/scout/`) so
 * `alerting:v2:enabled` stays unpinned and can be flipped at runtime. Both
 * flag states live in one file so they cannot run on parallel workers against
 * the same global setting. The dedicated `scout_alerting_v2` config pins the
 * setting on and cannot cover the flag-off case.
 *
 * One test per URL so a redirect or title mismatch is isolated to that path.
 * Tab-switch tests stay in this file so they cannot race the flag-off cases.
 */
test.describe(
  'Observability Alerting URLs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    for (const surface of OBSERVABILITY_ALERTING_SURFACES) {
      test(`returns app not found for ${surface.name} (${surface.path}) when alerting v2 is disabled`, async ({
        kbnClient,
        log,
        pageObjects,
      }) => {
        await unsetAlertingV2EnabledSetting(kbnClient);

        const requested = pageObjects.observabilityAlerting.urlFor(surface.path);
        log.debug(`[observability-alerting] requested ${requested}`);

        const landed = await pageObjects.observabilityAlerting.goto(surface.path);
        log.debug(`[observability-alerting] landed ${landed}`);

        await expect(pageObjects.observabilityAlerting.appNotFoundPageContent).toBeVisible({
          timeout: 30_000,
        });
      });

      test(`loads ${surface.name} (${surface.path}) when alerting v2 is enabled`, async ({
        kbnClient,
        log,
        pageObjects,
      }) => {
        await setAlertingV2EnabledSetting(kbnClient, true);

        const requested = pageObjects.observabilityAlerting.urlFor(surface.path);
        log.debug(`[observability-alerting] requested ${requested}`);

        const landed = await pageObjects.observabilityAlerting.goto(surface.path);
        log.debug(`[observability-alerting] landed ${landed}`);

        await expect(pageObjects.observabilityAlerting.pageTitle).toHaveText(surface.title, {
          timeout: 30_000,
        });
      });
    }

    test('switches between v1 and v2 rules tabs without leaving observability', async ({
      kbnClient,
      page,
      pageObjects,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const alerting = pageObjects.observabilityAlerting;

      await test.step('start on v2 and switch to v1', async () => {
        await alerting.goto(OBSERVABILITY_ALERTING_RULES_V2_PATH);
        await expect(alerting.pageTitle).toHaveText('Rules', { timeout: 30_000 });
        await expect(alerting.v2RulesTab).toBeVisible();
        await expect(alerting.v1RulesTab).toBeVisible();

        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v1, switch back to v2', async () => {
        await alerting.clickV2RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V2_URL_RE);
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v2, switch to v1 again', async () => {
        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });
    });

    test('starts on v1 and keeps host-aware tabs after switching to v2 and back', async ({
      kbnClient,
      page,
      pageObjects,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const alerting = pageObjects.observabilityAlerting;

      await test.step('start on v1 and switch to v2', async () => {
        await alerting.goto(OBSERVABILITY_ALERTING_RULES_V1_PATH);
        await expect(alerting.pageTitle).toHaveText('Rules', { timeout: 30_000 });
        await expect(alerting.v1RulesTab).toBeVisible();
        await expect(alerting.v2RulesTab).toBeVisible();

        await alerting.clickV2RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V2_URL_RE);
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'false');
      });

      await test.step('from v2, switch back to v1', async () => {
        await alerting.clickV1RulesTab();
        await expect(page).toHaveURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
        await expect(alerting.v1RulesTab).toHaveAttribute('aria-selected', 'true');
        await expect(alerting.v2RulesTab).toHaveAttribute('aria-selected', 'false');
      });
    });
  }
);
