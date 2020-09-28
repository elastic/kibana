/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format as formatUrl } from 'url';
import supertestAsPromised from 'supertest-as-promised';

import { FtrProviderContext } from '../ftr_provider_context';

export function ReportingPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['security', 'share', 'timePicker']);

  class ReportingPage {
    async forceSharedItemsContainerSize({ width }: { width: number }) {
      await browser.execute(`
        var el = document.querySelector('[data-shared-items-container]');
        el.style.flex="none";
        el.style.width="${width}px";
      `);
    }

    async getReportURL(timeout: number) {
      log.debug('getReportURL');

      const url = await testSubjects.getAttribute('downloadCompletedReportButton', 'href', timeout);

      log.debug(`getReportURL got url: ${url}`);

      return url;
    }

    async removeForceSharedItemsContainerSize() {
      await browser.execute(`
        var el = document.querySelector('[data-shared-items-container]');
        el.style.flex = null;
        el.style.width = null;
      `);
    }

    async getResponse(fullUrl: string): Promise<supertestAsPromised.Response> {
      log.debug(`getResponse for ${fullUrl}`);
      const kibanaServerConfig = config.get('servers.kibana');
      const baseURL = formatUrl({
        ...kibanaServerConfig,
        auth: false,
      });
      const urlWithoutBase = fullUrl.replace(baseURL, '');
      const res = await security.testUserSupertest.get(urlWithoutBase);
      return res;
    }

    async getRawPdfReportData(url: string): Promise<Buffer> {
      log.debug(`getRawPdfReportData for ${url}`);
      const response = await this.getResponse(url);
      expect(response.body).to.be.a(Buffer);
      return response.body as Buffer;
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

    async clearToastNotifications() {
      const toasts = await testSubjects.findAll('toastCloseButton');
      await Promise.all(toasts.map(async (t) => await t.click()));
    }

    async getQueueReportError() {
      return await testSubjects.exists('queueReportError');
    }

    async getGenerateReportButton() {
      return await retry.try(async () => await testSubjects.find('generateReportButton'));
    }

    async isGenerateReportButtonDisabled() {
      const generateReportButton = await this.getGenerateReportButton();
      return await retry.try(async () => {
        const isDisabled = await generateReportButton.getAttribute('disabled');
        return isDisabled;
      });
    }

    async canReportBeCreated() {
      await this.clickGenerateReportButton();
      const success = await this.checkForReportingToasts();
      return success;
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
      const fromTime = 'Sep 19, 2015 @ 06:31:44.000';
      const toTime = 'Sep 19, 2015 @ 18:01:44.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
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
