/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';

export default function ({ getService }: FtrProviderContext) {
  describe('security_hosts_dashboard', () => {
    const performance = getService('performance');

    it('security_hosts_dashboard', async () => {
      await performance.runUserJourney(
        'security_hosts_dashboard',
        [
          {
            name: 'Go to Security Hosts Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/security/hosts`);
              await page.waitForSelector('[data-test-subj="table-allHosts-loading-false"]');
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
              await page.waitForSelector('[data-test-subj="table-allHosts-loading-false"]');
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
              await page.waitForSelector('[data-test-subj="table-allHosts-loading-false"]');
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
              await page.waitForSelector('[data-test-subj="table-allHosts-loading-false"]');
            },
          },
          {
            name: 'Open Authentications sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-uncommonProcesses"]');

              await page.waitForSelector(
                '[data-test-subj="table-uncommonProcesses-loading-false"]'
              );
            },
          },
          {
            name: 'Open Anomalies sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-anomalies"]');

              await page.waitForSelector('[data-test-subj="host-anomalies-table"]');
            },
          },
          {
            name: 'Open Events sub-tab',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="navigation-events"]');

              await page.waitForSelector('[data-test-subj="events-container-loading-false"]');
            },
          },
          {
            name: 'Change number of events displayed to 50',
            handler: async ({ page }) => {
              await page.click('[data-test-subj="tablePaginationPopoverButton"]');
              await page.click('[data-test-subj="tablePagination-50-rows"]');

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
