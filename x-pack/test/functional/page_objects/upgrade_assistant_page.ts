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

  async navigateToEsDeprecationLogs() {
    return await this.retry.try(async () => {
      await this.common.navigateToUrl('management', 'stack/upgrade_assistant/es_deprecation_logs', {
        shouldUseHashForSubUrl: false,
      });
      await this.retry.waitFor(
        'url to contain /upgrade_assistant/es_deprecation_logs',
        async () => {
          const url = await this.browser.getCurrentUrl();
          return url.includes('/es_deprecation_logs');
        }
      );
    });
  }

  async clickEsDeprecationsPanel() {
    return await this.retry.try(async () => {
      await this.testSubjects.click('esStatsPanel');
    });
  }

  async clickDeprecationLoggingToggle() {
    return await this.retry.try(async () => {
      await this.testSubjects.click('deprecationLoggingToggle');
    });
  }

  async isDeprecationLoggingEnabled(): Promise<boolean> {
    return await this.testSubjects.exists('externalLinksTitle');
  }

  async clickResetLastCheckpointButton() {
    return await this.retry.try(async () => {
      await this.testSubjects.click('resetLastStoredDate');
    });
  }

  async clickKibanaDeprecationsPanel() {
    return await this.retry.try(async () => {
      await this.testSubjects.click('kibanaStatsPanel');
    });
  }

  async clickKibanaDeprecation(selectedIssue: string) {
    const table = await this.testSubjects.find('kibanaDeprecationsTable');
    const rows = await table.findAllByTestSubject('row');

    const selectedRow = rows.find(async (row) => {
      const issue = await (await row.findByTestSubject('issueCell')).getVisibleText();
      return issue === selectedIssue;
    });

    if (selectedRow) {
      const issueLink = await selectedRow.findByTestSubject('deprecationDetailsLink');
      await issueLink.click();
    } else {
      this.log.debug('Unable to find selected deprecation row');
    }
  }

  async clickEsDeprecation(deprecationType: 'indexSettings' | 'default' | 'reindex' | 'ml') {
    const table = await this.testSubjects.find('esDeprecationsTable');
    const deprecationIssueLink = await (
      await table.findByTestSubject(`${deprecationType}TableCell-message`)
    ).findByCssSelector('button');

    if (deprecationIssueLink) {
      await deprecationIssueLink.click();
    } else {
      this.log.debug('Unable to find selected deprecation');
    }
  }
}
