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
  const remote = getService('remote');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'security', 'header', 'settings']);

  class ReportingPage {
    async initTests() {
      log.debug('ReportingPage:initTests');
      await PageObjects.settings.navigateTo();
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('reporting/historic');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });

      await remote.setWindowSize(1600, 850);
    }

    async clickTopNavReportingLink() {
      await retry.try(() => testSubjects.click('topNavReportingLink'));
    }

    async isReportingPanelOpen() {
      const generateReportButtonExists = await this.getGenerateReportButtonExists();
      const unsavedChangesWarningExists = await this.getUnsavedChangesWarningExists();
      const isOpen = generateReportButtonExists || unsavedChangesWarningExists;
      log.debug('isReportingPanelOpen: ' + isOpen);
      return isOpen;
    }

    async getUrlOfTab(tabIndex) {
      return await retry.try(async () => {
        log.debug(`reportingPage.getUrlOfTab(${tabIndex}`);
        const handles = await remote.getAllWindowHandles();
        log.debug(`Switching to window ${handles[tabIndex]}`);
        await remote.switchToWindow(handles[tabIndex]);

        const url = await remote.getCurrentUrl();
        if (!url || url === 'about:blank') {
          throw new Error('url is blank');
        }

        await remote.switchToWindow(handles[0]);
        return url;
      });
    }

    async closeTab(tabIndex) {
      return await retry.try(async () => {
        log.debug(`reportingPage.closeTab(${tabIndex}`);
        const handles = await remote.getAllWindowHandles();
        log.debug(`Switching to window ${handles[tabIndex]}`);
        await remote.switchToWindow(handles[tabIndex]);
        await remote.closeCurrentWindow();
        await remote.switchToWindow(handles[0]);
      });
    }

    async forceSharedItemsContainerSize({ width }) {
      await remote.execute(`
        var el = document.querySelector('[data-shared-items-container]');
        el.style.flex="none";
        el.style.width="${width}px";
      `);
    }

    async removeForceSharedItemsContainerSize() {
      await remote.execute(`
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
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`
      };
      const parsedUrl = parse(url);
      return new Promise((resolve, reject) => {
        http.get(
          {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            port: parsedUrl.port,
            responseType: 'arraybuffer',
            headers
          },
          res => {
            res.on('data', function (chunk) {
              data.push(chunk);
            });
            res.on('end', function () {
              data = Buffer.concat(data);
              resolve(data);
            });
          }).on('error', (e) => {
          reject(e);
        });
      });
    }

    async openReportingPanel() {
      log.debug('openReportingPanel');
      await retry.try(async () => {
        const isOpen = await this.isReportingPanelOpen();

        if (!isOpen) {
          await this.clickTopNavReportingLink();
        }

        const wasOpened = await this.isReportingPanelOpen();
        if (!wasOpened) {
          throw new Error('Reporting panel was not opened successfully');
        }
      });
    }

    async clickDownloadReportButton(timeout) {
      await testSubjects.click('downloadCompletedReportButton', timeout);
    }

    async getUnsavedChangesWarningExists() {
      return await testSubjects.exists('unsavedChangesReportingWarning');
    }

    async getGenerateReportButtonExists() {
      return await testSubjects.exists('generateReportButton');
    }

    async getQueueReportError() {
      return await testSubjects.exists('queueReportError');
    }

    async getGenerateReportButton() {
      return await retry.try(() => testSubjects.find('generateReportButton'));
    }

    async clickPreserveLayoutOption() {
      await retry.try(() => testSubjects.click('preserveLayoutOption'));
    }

    async clickGenerateReportButton() {
      await retry.try(() => testSubjects.click('generateReportButton'));
    }

    async checkForReportingToasts() {
      log.debug('Reporting:checkForReportingToasts');
      const isToastPresent = await testSubjects.exists('completeReportSuccess', 60000);
      // Close toast so it doens't obscure the UI.
      await testSubjects.click('completeReportSuccess toastCloseButton');
      return isToastPresent;
    }

    async setTimepickerInDataRange() {
      log.debug('Reporting:setTimepickerInDataRange');
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    }

    async setTimepickerInNoDataRange() {
      log.debug('Reporting:setTimepickerInNoDataRange');
      const fromTime = '1999-09-19 06:31:44.000';
      const toTime = '1999-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    }
  }

  return new ReportingPage();
}
