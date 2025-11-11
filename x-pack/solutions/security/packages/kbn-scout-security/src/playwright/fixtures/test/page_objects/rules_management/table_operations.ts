/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator } from '@kbn/scout';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { RulesManagementLocators } from './rules_management_locators';

/**
 * Operations related to the rules table
 *
 * This class handles waiting for table loads, refreshing, and getting row counts.
 */
export class TableOperations {
  constructor(private readonly locators: RulesManagementLocators) {}

  /**
   * Waits for the rules table to finish loading
   */
  async waitForRulesTableToLoad() {
    // Wait for refresh indicator to appear
    await this.locators.rulesTableRefreshIndicator
      .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_SHORT })
      .catch(() => {
        // Indicator might not appear if load is very fast
      });

    // Wait for refresh indicator to disappear
    await this.locators.rulesTableRefreshIndicator.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Refreshes the rules table
   */
  async refreshRulesTable() {
    await this.locators.refreshRulesButton.click();
    await this.waitForRulesTableToLoad();
  }

  /**
   * Gets all rule rows from the current table
   * @returns Promise<Locator> of all rule rows
   */
  getRulesTableRows(): Locator {
    return this.locators.rulesManagementTable.locator('.euiTableRow');
  }

  /**
   * Gets the count of visible rules in the table
   */
  async getRulesCount(): Promise<number> {
    const rows = this.getRulesTableRows();
    return rows.count();
  }

  /**
   * Dismisses all toast notifications
   */
  async dismissToasts() {
    const toastButtons = this.locators.toastCloseButton;
    const count = await toastButtons.count();

    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line playwright/no-nth-methods
      const button = toastButtons.nth(i);
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
      }
    }
  }
}
