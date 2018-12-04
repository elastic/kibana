/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function UpgradeCheckupProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);

  class UpgradeCheckup {
    async initTests() {
      log.debug('UpgradeCheckup:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        await PageObjects.common.navigateToApp('settings');
        await PageObjects.settings.clickElasticsearchUpgradeCheckup();
      });
    }

    async expectUpgradeCheckup() {
      return await retry.try(async () => {
        log.debug(`expectUpgradeCheckup()`);
        expect(testSubjects.exists('upgradeCheckupRoot')).to.be.true;
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/upgrade_checkup`);
      });
    }

    async toggleDeprecationLogging() {
      return await retry.try(async () => {
        log.debug('toggleDeprecationLogging()');
        await testSubjects.click('upgradeCheckupDeprecationToggle');
      });
    }

    async expectDeprecationLoggingLabel(labelText) {
      return await retry.try(async () => {
        log.debug('expectDeprecationLoggingLabel()');
        const toggle = await testSubjects.find('upgradeCheckupDeprecationToggle');
        const div = await toggle.getProperty('parentElement');
        const label = await div.findByCssSelector('label');
        expect(await label.getVisibleText()).to.eql(labelText);
      });
    }

    async clickTab(tabId) {
      return await retry.try(async () => {
        log.debug('clickTab()');
        const tab = await find.byCssSelector(`.euiTabs .euiTab#${tabId}`);
        await tab.click();
      });
    }

    async expectIssueSummary(summary) {
      return await retry.try(async () => {
        log.debug('expectIssueSummary()');
        const summaryEl = await testSubjects.find('upgradeCheckupIssueSummary');
        const summaryElText = await summaryEl.getVisibleText();
        expect(summaryElText).to.eql(summary);
      });
    }
  }

  return new UpgradeCheckup();
}
