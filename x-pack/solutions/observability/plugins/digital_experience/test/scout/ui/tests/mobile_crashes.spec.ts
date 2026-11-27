/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { CRASH_APPS, NPE_LATEST_SESSION } from '../../common/fixtures/mobile_crash_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

test.describe('Digital Experience mobile crashes', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  test("lists a mobile application's crash groups and opens one's detail", async ({
    page,
    pageObjects: { digitalExperience, discover },
  }) => {
    // The API spec and the table's component tests check the ranking and the New badges.
    await test.step('lists the crash groups', async () => {
      await digitalExperience.gotoMobileCrashes(CRASH_APPS.android);

      await expect(digitalExperience.mobileCrashesTab).toBeVisible();
      await expect(
        digitalExperience.mobileCrashGroupLinks.filter({
          hasText: 'java.lang.NullPointerException',
        })
      ).toBeVisible();
    });

    await test.step('has no accessibility violations on the Crashes tab', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });

    await test.step("opens a group's detail, kept in the URL across a reload", async () => {
      await digitalExperience.mobileCrashGroupLinks
        .filter({ hasText: 'java.lang.NullPointerException' })
        .click();

      await expect(page).toHaveURL(/crashGroup=/);
      await expect(digitalExperience.mobileCrashStacktrace).toContainText('MainActivity.onResume');
      await page.reload();
      await expect(digitalExperience.mobileCrashStacktrace).toContainText('MainActivity.onResume');
    });

    // The API spec and the flyout's component tests check each row.
    await test.step('lists the session before the crash, with the crash', async () => {
      await expect(
        digitalExperience.mobileCrashTimeline.rows.filter({ hasText: 'At the crash' })
      ).toHaveCount(1);
    });

    await test.step('has no accessibility violations in the detail', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="digitalExperienceMobileCrashFlyout"]'],
      });
      expect(violations).toHaveLength(0);
    });

    await test.step('closes the detail, and drops it from the URL', async () => {
      await digitalExperience.mobileCrashFlyout.getByTestId('euiFlyoutCloseButton').click();

      await expect(digitalExperience.mobileCrashFlyout).toBeHidden();
      await expect(page).not.toHaveURL(/crashGroup=/);
    });

    await test.step("opens the crash's session in Discover", async () => {
      await digitalExperience.mobileCrashGroupLinks
        .filter({ hasText: 'java.lang.NullPointerException' })
        .click();
      await digitalExperience.mobileCrashOpenSession.click();

      await expect(page).toHaveURL(/\/app\/discover/);
      await expect.poll(() => discover.getEsqlQueryValue()).toContain(NPE_LATEST_SESSION);
      // Its raw documents: the screen, the POST as sent three times, the GET, two taps, and the
      // crash.
      await expect(discover.getHitCountLocator()).toHaveText('8');
    });
  });

  test('reaches the Crashes tab from the Overview, keeping the filters', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoMobileCrashes(CRASH_APPS.android, { release: '4.1.0' });
    await expect(digitalExperience.mobileCrashGroupLinks).toHaveText([
      'java.lang.IllegalStateException',
    ]);

    await digitalExperience.mobileOverviewTab.click();
    await expect(digitalExperience.mobileKpis).toBeVisible();
    await digitalExperience.mobileCrashesTab.click();

    await expect(page).toHaveURL(/\/crashes\?.*release=4\.1\.0/);
    await expect(digitalExperience.mobileCrashGroupLinks).toHaveText([
      'java.lang.IllegalStateException',
    ]);
  });
});
