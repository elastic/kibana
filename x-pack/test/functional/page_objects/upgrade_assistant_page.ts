/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
        retry.waitFor('url to contain /upgrade_assistant', async () => {
          const url = await browser.getCurrentUrl();
          return url.includes('/upgrade_assistant');
        });
      });
    }

    async toggleDeprecationLogging() {
      log.debug('toggleDeprecationLogging()');
      await testSubjects.click('upgradeAssistantDeprecationToggle');
    }

    async isDeprecationLoggingEnabled() {
      const isDeprecationEnabled = await testSubjects.getAttribute(
        'upgradeAssistantDeprecationToggle',
        'aria-checked'
      );
      log.debug(`Deprecation enabled == ${isDeprecationEnabled}`);
      return isDeprecationEnabled === 'true';
    }

    async deprecationLoggingEnabledLabel() {
      const loggingEnabledLabel = await find.byCssSelector(
        '[data-test-subj="upgradeAssistantDeprecationToggle"] ~ span'
      );
      return await loggingEnabledLabel.getVisibleText();
    }

    async clickTab(tabId: string) {
      return await retry.try(async () => {
        log.debug('clickTab()');
        await find.clickByCssSelector(`.euiTabs .euiTab#${tabId}`);
      });
    }

    async waitForTelemetryHidden() {
      const self = this;
      retry.waitFor('Telemetry to disappear.', async () => {
        return (await self.isTelemetryExists()) === false;
      });
    }

    async issueSummaryText() {
      log.debug('expectIssueSummary()');
      return await testSubjects.getVisibleText('upgradeAssistantIssueSummary');
    }

    async isTelemetryExists() {
      return await testSubjects.exists('upgradeAssistantTelemetryRunning');
    }
  }

  return new UpgradeAssistant();
}
