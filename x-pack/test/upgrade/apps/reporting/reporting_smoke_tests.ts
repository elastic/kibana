/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ReportingUsageStats } from '../../services/reporting_upgrade_services';

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
  const log = getService('log');
  const retry = getService('retry');

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

  describe('reporting ', () => {
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
      describe('space ' + space, () => {
        beforeEach(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          usage = (await usageAPI.getUsageStats()) as UsageStats;
          completedReportCount = reportingAPI.getCompletedReportCount(usage);
        });
        reportingTests.forEach(({ name, type, link }) => {
          it('name: ' + name + ' type: ' + type, async () => {
            let startTime;
            await PageObjects.home.launchSampleDashboard(name);
            await PageObjects.share.openShareMenuItem(link);
            if (type === 'pdf_optimize') {
              await testSubjects.click('usePrintLayout');
            }
            const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
            // if we can read the clipboard (not Chrome headless) then get the reporting URL and post it
            // else click the reporting button and wait for the count of completed reports to increment
            if (canReadClipboard) {
              log.debug('We have clipboard access.  Getting the POST URL and posting it via API');
              const advOpt = await find.byXPath(
                `//button[descendant::*[text()='Advanced options']]`
              );
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
              // Add try/catch for https://github.com/elastic/elastic-stack-testing/issues/1199
              // Waiting for job to finish sometimes gets socket hang up error, from what I
              // observed during debug testing the command does complete.
              // Checking expected report count will still fail if the job did not finish.
              try {
                await reportingAPI.expectAllJobsToFinishSuccessfully([
                  await reportingAPI.postJob(parse(url).pathname + '?' + parse(url).query),
                ]);
              } catch (e) {
                log.debug(`Error waiting for job to finish: ${e}`);
              }
              startTime = new Date();
            } else {
              log.debug(`We don't have clipboard access.  Clicking the Generate report button`);
              await testSubjects.click('generateReportButton');
              startTime = new Date();
            }

            await retry.tryForTime(50000, async () => {
              usage = (await usageAPI.getUsageStats()) as UsageStats;
              reportingAPI.expectCompletedReportCount(usage, completedReportCount + 1);
            });
            log.debug(`Elapsed Time: ${new Date().getTime() - startTime.getTime()}`);
          });
        });
      });
    });
  });
}
