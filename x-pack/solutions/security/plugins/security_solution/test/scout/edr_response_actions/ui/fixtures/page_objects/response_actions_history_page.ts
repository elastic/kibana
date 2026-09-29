/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const HISTORY_APP_PATH = 'security/administration/response_actions_history';

// Page view lists agent types above these options, and the selectable only renders
// about seven rows. The action-type options sit on the clipped edge, so a click
// at the row's center often misses. Labels match FILTER_TYPE_OPTIONS.
const TYPE_FILTER_QUERY_VALUE: Record<string, string> = {
  'Triggered by rule': 'automated',
  'Triggered manually': 'manual',
};

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

  async toggleTypeFilter(label: string): Promise<void> {
    const option = this.typeFilterOption(label);
    await this.openTypesFilter();
    const shouldSelect = (await option.getAttribute('aria-checked')) !== 'true';

    await this.clickTypeOption(option);
    await this.waitForCheckedState(option, shouldSelect);

    // Leave the popover open. Selecting an option does not close it, and
    // clicking the filter button to dismiss it opens the popover again.
    await this.waitForTypeQuery(label, shouldSelect);
  }

  private typeFilterOption(label: string): Locator {
    return this.page.testSubj.locator('types-filter-option').filter({ hasText: label });
  }

  private typesFilterList(): Locator {
    return this.page.testSubj.locator('response-actions-list-types-filter-popoverList');
  }

  private async openTypesFilter(): Promise<void> {
    const list = this.typesFilterList();
    if (await list.isVisible()) {
      return;
    }
    await this.typesFilterButton.click();
    await list.waitFor({ state: 'visible' });
  }

  // Scroll before clicking. The option is in the DOM while its center sits
  // outside the list viewport, and Playwright then clicks whatever is underneath.
  private async clickTypeOption(option: Locator): Promise<void> {
    await option.evaluate((element) => {
      element.scrollIntoView({ block: 'center' });
    });
    await option.click();
  }

  private async waitForCheckedState(option: Locator, selected: boolean): Promise<void> {
    const checkedState = selected
      ? option.and(this.page.locator('[aria-checked="true"]'))
      : option.and(this.page.locator(':not([aria-checked="true"])'));
    await checkedState.waitFor({ state: 'attached' });
  }

  private async waitForTypeQuery(label: string, selected: boolean): Promise<void> {
    const value = TYPE_FILTER_QUERY_VALUE[label];
    if (!value) {
      return;
    }
    await this.page.waitForURL((url) => {
      const types = new URL(url).searchParams.get('types')?.split(',').filter(Boolean) ?? [];
      return selected ? types.includes(value) : !types.includes(value);
    });
  }

  ruleLinkForHost(hostname: string): Locator {
    return this.dataRows()
      .filter({ hasText: hostname })
      .locator('[data-test-subj="response-actions-list-column-ruleName"]');
  }
}
