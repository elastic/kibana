/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';

export default function ({ getService }: FtrProviderContext) {
  describe('security_users_dashboard', () => {
    const performance = getService('performance');
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/performance/es_archives/security_dashboard_data');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/performance/es_archives/security_dashboard_data');
    });

    it('security_users_dashboard', async () => {
      await performance.runUserJourney(
        'security_users_dashboard',
        [
          {
            name: 'Go to Security Users Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/security/users/allUsers`);
              await page.waitForSelector('[data-test-subj="table-allUsers-loading-false"]');
            },
          },
          {
            name: 'Change time range to 24hr',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="superDatePickerShowDatesButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const startDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await startDate.fill('Jan 1, 2020 @ 00:00:00.000');

              await page.click('[data-test-subj="superDatePickerendDatePopoverButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const endDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await endDate.fill('Jan 1, 2020 @ 23:59:59.999');

              await page.click('[data-test-subj=querySubmitButton]');
              await page.waitForSelector('[data-test-subj="table-allUsers-loading-false"]');
            },
          },
          {
            name: 'Change time range to 8hr',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="superDatePickerstartDatePopoverButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const startDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await startDate.fill('Jan 1, 2020 @ 08:00:00.000');

              await page.click('[data-test-subj="superDatePickerendDatePopoverButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const endDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await endDate.fill('Jan 1, 2020 @ 15:59:59.999');

              await page.click('[data-test-subj=querySubmitButton]');
              await page.waitForSelector('[data-test-subj="table-allUsers-loading-false"]');
            },
          },
          {
            name: 'Change time range to 1hr',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="superDatePickerstartDatePopoverButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const startDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await startDate.fill('Jan 1, 2020 @ 16:00:00.000');

              await page.click('[data-test-subj="superDatePickerendDatePopoverButton"]');
              await page.click('[data-test-subj=superDatePickerAbsoluteTab]');
              const endDate = page.locator('[data-test-subj=superDatePickerAbsoluteDateInput]');
              await endDate.fill('Jan 1, 2020 @ 17:59:59.999');

              await page.click('[data-test-subj=querySubmitButton]');
              await page.waitForSelector('[data-test-subj="table-allUsers-loading-false"]');
            },
          },
          {
            name: 'Open Authentications sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-authentications"]');

              await page.waitForSelector(
                '[data-test-subj="table-users-authentications-loading-false"]'
              );
            },
          },
          {
            name: 'Open Anomalies sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-anomalies"]');

              await page.waitForSelector('[data-test-subj="user-anomalies-table"]');
            },
          },
          {
            name: 'Open Events sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-events"]');

              await page.waitForSelector('[data-test-subj="events-container-loading-false"]');
            },
          },
        ],
        {
          requireAuth: false,
        }
      );
    });
  });
}
