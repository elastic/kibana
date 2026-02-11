/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import type { RulesPage } from './rules_page';

export class AlertPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigates to the Alert Details page
   */
  async goto(alertId: string = '') {
    await this.page.gotoApp(`observability/alerts/${alertId}`);
  }

  async gotoAlertByRuleId(rulesPage: RulesPage, ruleId: string) {
    await rulesPage.goto(ruleId);

    await expect(this.page.testSubj.locator('ruleName')).toBeVisible();

    await this.page.testSubj.waitForSelector('expand-event');
    const expandAlertButtons = await this.page.testSubj.locator('expand-event').all();
    expect(expandAlertButtons.length).toBeGreaterThan(0);

    await expandAlertButtons[0].click();

    const alertDetailsLink = this.page.testSubj.locator('alertsFlyoutAlertDetailsButton');
    await expect(alertDetailsLink).toBeVisible();
    await alertDetailsLink.click();

    await this.page.testSubj.waitForSelector('observability.rules.custom_threshold');

    const alertId = this.page.url().split('/').pop() || '';
    return alertId;
  }
}
