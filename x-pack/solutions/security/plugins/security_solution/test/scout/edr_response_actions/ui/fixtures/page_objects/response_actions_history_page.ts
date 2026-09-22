/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const HISTORY_APP_PATH = 'security/administration/response_actions_history';

export class ResponseActionsHistoryPage {
  readonly table: Locator;
  readonly typesFilterButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('response-actions-list');
    this.typesFilterButton = this.page.testSubj.locator(
      'response-actions-list-types-filter-popoverButton'
    );
  }

  dataRows(): Locator {
    return this.table.locator('tbody').getByRole('row');
  }

  async goto(agentIds: readonly string[]): Promise<void> {
    await this.page.gotoApp(HISTORY_APP_PATH, {
      params: { hosts: agentIds.join(',') },
    });
    await this.table.waitFor({ state: 'visible' });
  }

  async waitForHostname(hostname: string): Promise<void> {
    await this.page.testSubj
      .locator('response-actions-list-column-hostname')
      .filter({ hasText: hostname })
      .waitFor({ state: 'visible' });
  }

  async toggleTypeFilter(label: string): Promise<void> {
    const option = this.page.testSubj.locator('types-filter-option').filter({ hasText: label });
    if (!(await option.isVisible())) {
      await this.typesFilterButton.click();
      await option.waitFor({ state: 'visible' });
    }
    await option.click();
  }

  ruleLinkForHost(hostname: string): Locator {
    return this.dataRows()
      .filter({ hasText: hostname })
      .locator('[data-test-subj="response-actions-list-column-ruleName"]');
  }
}
