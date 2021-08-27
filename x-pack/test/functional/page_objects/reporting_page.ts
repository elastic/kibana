/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { format as formatUrl } from 'url';
import type SuperTest from 'supertest';

import { FtrService } from '../ftr_provider_context';
import { REPORT_TABLE_ID, REPORT_TABLE_ROW_ID } from '../../../plugins/reporting/common/constants';

export class ReportingPageObject extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly security = this.ctx.getService('security');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly share = this.ctx.getPageObject('share');
  private readonly timePicker = this.ctx.getPageObject('timePicker');

  async forceSharedItemsContainerSize({ width }: { width: number }) {
    await this.browser.execute(`
      var el = document.querySelector('[data-shared-items-container]');
      el.style.flex="none";
      el.style.width="${width}px";
    `);
  }

  async getReportURL(timeout: number) {
    this.log.debug('getReportURL');

    const url = await this.testSubjects.getAttribute(
      'downloadCompletedReportButton',
      'href',
      timeout
    );

    this.log.debug(`getReportURL got url: ${url}`);

    return url;
  }

  async removeForceSharedItemsContainerSize() {
    await this.browser.execute(`
      var el = document.querySelector('[data-shared-items-container]');
      el.style.flex = null;
      el.style.width = null;
    `);
  }

  async getResponse(fullUrl: string): Promise<SuperTest.Response> {
    this.log.debug(`getResponse for ${fullUrl}`);
    const kibanaServerConfig = this.config.get('servers.kibana');
    const baseURL = formatUrl({
      ...kibanaServerConfig,
      auth: false,
    });
    const urlWithoutBase = fullUrl.replace(baseURL, '');
    const res = await this.security.testUserSupertest.get(urlWithoutBase);
    return res;
  }

  async getRawPdfReportData(url: string): Promise<Buffer> {
    this.log.debug(`getRawPdfReportData for ${url}`);
    const response = await this.getResponse(url);
    expect(response.body).to.be.a(Buffer);
    return response.body as Buffer;
  }

  async openCsvReportingPanel() {
    this.log.debug('openCsvReportingPanel');
    await this.share.openShareMenuItem('CSV Reports');
  }

  async openPdfReportingPanel() {
    this.log.debug('openPdfReportingPanel');
    await this.share.openShareMenuItem('PDF Reports');
  }

  async openPngReportingPanel() {
    this.log.debug('openPngReportingPanel');
    await this.share.openShareMenuItem('PNG Reports');
  }

  async clearToastNotifications() {
    const toasts = await this.testSubjects.findAll('toastCloseButton');
    await Promise.all(toasts.map(async (t) => await t.click()));
  }

  async getQueueReportError() {
    return await this.testSubjects.exists('errorToastMessage');
  }

  async getGenerateReportButton() {
    return await this.retry.try(async () => await this.testSubjects.find('generateReportButton'));
  }

  async isGenerateReportButtonDisabled() {
    const generateReportButton = await this.getGenerateReportButton();
    return await this.retry.try(async () => {
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
    await this.retry.tryForTime(menuAnimationDelay, () =>
      this.testSubjects.click('usePrintLayout')
    );
  }

  async clickGenerateReportButton() {
    await this.testSubjects.click('generateReportButton');
  }

  async toggleReportMode() {
    await this.testSubjects.click('reportModeToggle');
  }

  async checkForReportingToasts() {
    this.log.debug('Reporting:checkForReportingToasts');
    const isToastPresent = await this.testSubjects.exists('completeReportSuccess', {
      allowHidden: true,
      timeout: 90000,
    });
    // Close toast so it doesn't obscure the UI.
    if (isToastPresent) {
      await this.testSubjects.click('completeReportSuccess > toastCloseButton');
    }

    return isToastPresent;
  }

  async setTimepickerInDataRange() {
    this.log.debug('Reporting:setTimepickerInDataRange');
    const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
    const toTime = 'Aug 23, 2019 @ 16:18:51.821';
    await this.timePicker.setAbsoluteRange(fromTime, toTime);
  }

  async setTimepickerInNoDataRange() {
    this.log.debug('Reporting:setTimepickerInNoDataRange');
    const fromTime = 'Sep 19, 1999 @ 06:31:44.000';
    const toTime = 'Sep 23, 1999 @ 18:31:44.000';
    await this.timePicker.setAbsoluteRange(fromTime, toTime);
  }

  async getManagementList() {
    const table = await this.testSubjects.find(REPORT_TABLE_ID);
    const allRows = await table.findAllByTestSubject(REPORT_TABLE_ROW_ID);

    return await Promise.all(
      allRows.map(async (row) => {
        const $ = await row.parseDomContent();
        return {
          report: $.findTestSubject('reportingListItemObjectTitle').text().trim(),
          createdAt: $.findTestSubject('reportJobCreatedAt').text().trim(),
          status: $.findTestSubject('reportJobStatus').text().trim(),
          actions: $.findTestSubject('reportJobActions').text().trim(),
        };
      })
    );
  }
}
