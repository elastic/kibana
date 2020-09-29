/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function UpgradeAssistantPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const { common } = getPageObjects(['common']);

  class UpgradeAssistant {
    async initTests() {
      log.debug('UpgradeAssistant:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        await common.navigateToApp('settings');
        await testSubjects.click('upgrade_assistant');
      });
    }

    async expectUpgradeAssistant() {
      return await retry.try(async () => {
        log.debug(`expectUpgradeAssistant()`);
        expect(await testSubjects.exists('upgradeAssistantRoot')).to.equal(true);
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

    async expectDeprecationLoggingLabel(labelText: string) {
      return await retry.try(async () => {
        log.debug('expectDeprecationLoggingLabel()');
        const label = await find.byCssSelector(
          '[data-test-subj="upgradeAssistantDeprecationToggle"] ~ span'
        );
        const value = await label.getVisibleText();
        expect(value).to.equal(labelText);
      });
    }

    async clickTab(tabId: string) {
      return await retry.try(async () => {
        log.debug('clickTab()');
        await find.clickByCssSelector(`.euiTabs .euiTab#${tabId}`);
      });
    }

    async expectIssueSummary(summary: string) {
      return await retry.try(async () => {
        log.debug('expectIssueSummary()');
        const summaryElText = await testSubjects.getVisibleText('upgradeAssistantIssueSummary');
        expect(summaryElText).to.eql(summary);
      });
    }

    async expectTelemetryHasFinish() {
      return await retry.try(async () => {
        log.debug('expectTelemetryHasFinish');
        const isTelemetryFinished = !(await testSubjects.exists(
          'upgradeAssistantTelemetryRunning'
        ));
        expect(isTelemetryFinished).to.equal(true);
      });
    }
  }

  return new UpgradeAssistant();
}
