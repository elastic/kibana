/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ReportingUsageStats } from '../../reporting_services';

interface UsageStats {
  reporting: ReportingUsageStats;
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard', 'share']);
  const testSubjects = getService('testSubjects');

  const spaces = [
    { space: 'default', basePath: '' },
    { space: 'automation', basePath: 's/automation' },
  ];

  const reportingTests = [
    { name: 'flights', type: 'pdf', link: 'PDF Reports' },
    { name: 'flights', type: 'pdf_optimize', link: 'PDF Reports' },
    { name: 'flights', type: 'png', link: 'PNG Reports' },
    { name: 'logs', type: 'pdf', link: 'PDF Reports' },
    { name: 'logs', type: 'pdf_optimize', link: 'PDF Reports' },
    { name: 'logs', type: 'png', link: 'PNG Reports' },
    { name: 'ecommerce', type: 'pdf', link: 'PDF Reports' },
    { name: 'ecommerce', type: 'pdf_optimize', link: 'PDF Reports' },
    { name: 'ecommerce', type: 'png', link: 'PNG Reports' },
  ];

  describe('reporting smoke tests', () => {
    let completedReportCount: number;
    let usage: UsageStats;
    describe('initial state', () => {
      before(async () => {
        usage = (await usageAPI.getUsageStats()) as UsageStats;
      });

      it('shows reporting as available and enabled', async () => {
        expect(usage.reporting.available).to.be(true);
        expect(usage.reporting.enabled).to.be(true);
      });
    });
    spaces.forEach(({ space, basePath }) => {
      describe('generate report space ' + space, () => {
        beforeEach(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          usage = (await usageAPI.getUsageStats()) as UsageStats;
          completedReportCount = reportingAPI.getCompletedReportCount(usage);
        });
        reportingTests.forEach(({ name, type, link }) => {
          it('name ' + name + ' type ' + type, async () => {
            await PageObjects.home.launchSampleDashboard(name);
            await PageObjects.share.openShareMenuItem(link);
            if (type === 'pdf_optimize') {
              await testSubjects.click('usePrintLayout');
            }
            const advOpt = await find.byXPath(`//button[descendant::*[text()='Advanced options']]`);
            await advOpt.click();
            // Workaround for: https://github.com/elastic/kibana/issues/126540
            const isUrlTooLong = await testSubjects.exists('urlTooLongErrorMessage');
            if (isUrlTooLong) {
              // Save dashboard
              await PageObjects.dashboard.switchToEditMode();
              await PageObjects.dashboard.clickQuickSave();
              await PageObjects.share.openShareMenuItem(link);
              if (type === 'pdf_optimize') {
                await testSubjects.click('usePrintLayout');
              }
              const advOpt2 = await find.byXPath(
                `//button[descendant::*[text()='Advanced options']]`
              );
              await advOpt2.click();
            }
            const postUrl = await find.byXPath(`//button[descendant::*[text()='Copy POST URL']]`);
            await postUrl.click();
            const url = await browser.getClipboardValue();
            await reportingAPI.expectAllJobsToFinishSuccessfully([
              await reportingAPI.postJob(parse(url).pathname + '?' + parse(url).query),
            ]);
            usage = (await usageAPI.getUsageStats()) as UsageStats;
            reportingAPI.expectCompletedReportCount(usage, completedReportCount + 1);
          });
        });
      });
    });
  });
}
