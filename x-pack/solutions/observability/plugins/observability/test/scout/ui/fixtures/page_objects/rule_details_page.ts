/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { BIGGER_TIMEOUT, SHORTER_TIMEOUT } from '../constants';

/**
 * Observability-owned rule details page helpers. After the generic rule-details specs were
 * relocated to triggers_actions_ui, this page object only supports the
 * `custom_threshold_rule` specs which assert the rule name and rule type after saving.
 */
export class RuleDetailsPage {
  constructor(private readonly page: ScoutPage) {}

  public get ruleDetailsPage() {
    return this.page.testSubj.locator('ruleDetailsTitle');
  }

  public get ruleName() {
    return this.page.testSubj.locator('ruleName');
  }

  public get ruleType() {
    return this.page.testSubj.locator('ruleSummaryRuleType');
  }

  async expectRuleDetailsPageLoaded() {
    await expect(this.ruleDetailsPage).toBeVisible({ timeout: BIGGER_TIMEOUT });
    await expect(this.ruleName).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }
}
