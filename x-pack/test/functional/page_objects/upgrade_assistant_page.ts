/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class UpgradeAssistantPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly browser = this.ctx.getService('browser');
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');

  async initTests() {
    this.log.debug('UpgradeAssistant:initTests');
  }

  async navigateToPage() {
    return await this.retry.try(async () => {
      await this.common.navigateToApp('settings');
      await this.testSubjects.click('upgrade_assistant');
      await this.retry.waitFor('url to contain /upgrade_assistant', async () => {
        const url = await this.browser.getCurrentUrl();
        return url.includes('/upgrade_assistant');
      });
    });
  }

  async toggleDeprecationLogging() {
    this.log.debug('toggleDeprecationLogging()');
    await this.testSubjects.click('upgradeAssistantDeprecationToggle');
  }

  async isDeprecationLoggingEnabled() {
    const isDeprecationEnabled = await this.testSubjects.getAttribute(
      'upgradeAssistantDeprecationToggle',
      'aria-checked'
    );
    this.log.debug(`Deprecation enabled == ${isDeprecationEnabled}`);
    return isDeprecationEnabled === 'true';
  }

  async deprecationLoggingEnabledLabel() {
    const loggingEnabledLabel = await this.find.byCssSelector(
      '[data-test-subj="upgradeAssistantDeprecationToggle"] ~ span'
    );
    return await loggingEnabledLabel.getVisibleText();
  }

  async clickTab(tabId: string) {
    return await this.retry.try(async () => {
      this.log.debug('clickTab()');
      await this.find.clickByCssSelector(`.euiTabs .euiTab#${tabId}`);
    });
  }

  async waitForTelemetryHidden() {
    const self = this;
    await this.retry.waitFor('Telemetry to disappear.', async () => {
      return (await self.isTelemetryExists()) === false;
    });
  }

  async issueSummaryText() {
    this.log.debug('expectIssueSummary()');
    return await this.testSubjects.getVisibleText('upgradeAssistantIssueSummary');
  }

  async isTelemetryExists() {
    return await this.testSubjects.exists('upgradeAssistantTelemetryRunning');
  }
}
