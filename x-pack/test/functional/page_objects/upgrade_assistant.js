/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function UpgradeAssistantProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);

  class UpgradeAssistant {
    async initTests() {
      log.debug('UpgradeAssistant:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        await PageObjects.common.navigateToApp('settings');
        await testSubjects.click('upgrade_assistant');
      });
    }

    async expectUpgradeAssistant() {
      return await retry.try(async () => {
        log.debug(`expectUpgradeAssistant()`);
        expect(testSubjects.exists('upgradeAssistantRoot')).to.be.true;
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/upgrade_assistant`);
      });
    }

    async toggleDeprecationLogging() {
      return await retry.try(async () => {
        log.debug('toggleDeprecationLogging()');
        await testSubjects.click('upgradeAssistantDeprecationToggle');
      });
    }

    async expectDeprecationLoggingLabel(labelText) {
      return await retry.try(async () => {
        log.debug('expectDeprecationLoggingLabel()');
        const toggle = await testSubjects.find('upgradeAssistantDeprecationToggle');
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
        const summaryEl = await testSubjects.find('upgradeAssistantIssueSummary');
        const summaryElText = await summaryEl.getVisibleText();
        expect(summaryElText).to.eql(summary);
      });
    }
  }

  return new UpgradeAssistant();
}
