/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import http from 'http';

export function ReportingPageProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'security', 'settings', 'share', 'timePicker']);

  class ReportingPage {
    async initTests() {
      log.debug('ReportingPage:initTests');
      await PageObjects.settings.navigateTo();
      await esArchiver.loadIfNeeded('../../functional/es_archives/logstash_functional');
      await esArchiver.load('historic');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      await browser.setWindowSize(1600, 850);
    }

    async getUrlOfTab(tabIndex) {
      return await retry.try(async () => {
        log.debug(`reportingPage.getUrlOfTab(${tabIndex}`);
        const handles = await browser.getAllWindowHandles();
        log.debug(`Switching to window ${handles[tabIndex]}`);
        await browser.switchToWindow(handles[tabIndex]);

        const url = await browser.getCurrentUrl();
        if (!url || url === 'about:blank') {
          throw new Error('url is blank');
        }

        await browser.switchToWindow(handles[0]);
        return url;
      });
    }

    async closeTab(tabIndex) {
      return await retry.try(async () => {
        log.debug(`reportingPage.closeTab(${tabIndex}`);
        const handles = await browser.getAllWindowHandles();
        log.debug(`Switching to window ${handles[tabIndex]}`);
        await browser.switchToWindow(handles[tabIndex]);
        await browser.closeCurrentWindow();
        await browser.switchToWindow(handles[0]);
      });
    }

    async forceSharedItemsContainerSize({ width }) {
      await browser.execute(`
        var el = document.querySelector('[data-shared-items-container]');
        el.style.flex="none";
        el.style.width="${width}px";
      `);
    }

    async removeForceSharedItemsContainerSize() {
      await browser.execute(`
        var el = document.querySelector('[data-shared-items-container]');
        el.style.flex = null;
        el.style.width = null;
      `);
    }

    getRawPdfReportData(url) {
      log.debug(`getRawPdfReportData for ${url}`);
      let data = []; // List of Buffer objects
      const auth = config.get('servers.elasticsearch.auth');
      const headers = {
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
      };
      const parsedUrl = parse(url);
      return new Promise((resolve, reject) => {
        http
          .get(
            {
              hostname: parsedUrl.hostname,
              path: parsedUrl.path,
              port: parsedUrl.port,
              responseType: 'arraybuffer',
              headers,
            },
            res => {
              res.on('data', function(chunk) {
                data.push(chunk);
              });
              res.on('end', function() {
                data = Buffer.concat(data);
                resolve(data);
              });
            }
          )
          .on('error', e => {
            reject(e);
          });
      });
    }

    async openCsvReportingPanel() {
      log.debug('openCsvReportingPanel');
      await PageObjects.share.openShareMenuItem('CSV Reports');
    }

    async openPdfReportingPanel() {
      log.debug('openPdfReportingPanel');
      await PageObjects.share.openShareMenuItem('PDF Reports');
    }

    async openPngReportingPanel() {
      log.debug('openPngReportingPanel');
      await PageObjects.share.openShareMenuItem('PNG Reports');
    }

    async clickDownloadReportButton(timeout) {
      await testSubjects.click('downloadCompletedReportButton', timeout);
    }

    async clearToastNotifications() {
      const toasts = await testSubjects.findAll('toastCloseButton');
      await Promise.all(toasts.map(async t => await t.click()));
    }

    async getQueueReportError() {
      return await testSubjects.exists('queueReportError');
    }

    async getGenerateReportButton() {
      return await retry.try(async () => await testSubjects.find('generateReportButton'));
    }

    async checkUsePrintLayout() {
      // The print layout checkbox slides in as part of an animation, and tests can
      // attempt to click it too quickly, leading to flaky tests. The 500ms wait allows
      // the animation to complete before we attempt a click.
      const menuAnimationDelay = 500;
      await retry.tryForTime(menuAnimationDelay, () => testSubjects.click('usePrintLayout'));
    }

    async clickGenerateReportButton() {
      await testSubjects.click('generateReportButton');
    }

    async checkForReportingToasts() {
      log.debug('Reporting:checkForReportingToasts');
      const isToastPresent = await testSubjects.exists('completeReportSuccess', {
        allowHidden: true,
        timeout: 90000,
      });
      // Close toast so it doesn't obscure the UI.
      if (isToastPresent) {
        await testSubjects.click('completeReportSuccess > toastCloseButton');
      }

      return isToastPresent;
    }

    async setTimepickerInDataRange() {
      log.debug('Reporting:setTimepickerInDataRange');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    }

    async setTimepickerInNoDataRange() {
      log.debug('Reporting:setTimepickerInNoDataRange');
      const fromTime = 'Sep 19, 1999 @ 06:31:44.000';
      const toTime = 'Sep 23, 1999 @ 18:31:44.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    }
  }

  return new ReportingPage();
}
