/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';
import { EntityAnalyticsPage } from './entity_analytics_po';
import { EntityAnalyticsManagementPage } from './entity_analytics_management_po';
import { RuleDetailsPage } from './rule_details_page_po';
import { RuleManagementPage } from './rule_management_po';

export class PageFactory {
  static async createEntityAnalyticsPage(page: Page): Promise<EntityAnalyticsPage> {
    const entityAnalyticsPage = new EntityAnalyticsPage(page);
    await entityAnalyticsPage.initialize();
    return entityAnalyticsPage;
  }

  static async createEntityAnalyticsManagementPage(
    page: Page
  ): Promise<EntityAnalyticsManagementPage> {
    const entityAnalyticsManagementPage = new EntityAnalyticsManagementPage(page);
    await entityAnalyticsManagementPage.initialize();
    return entityAnalyticsManagementPage;
  }

  static async createRuleDetailsPage(page: Page): Promise<RuleDetailsPage> {
    const ruleDetailsPage = new RuleDetailsPage(page);
    await ruleDetailsPage.initialize();
    return ruleDetailsPage;
  }

  static async createRuleManagementPage(page: Page): Promise<RuleManagementPage> {
    const ruleManagementPage = new RuleManagementPage(page);
    await ruleManagementPage.initialize();
    return ruleManagementPage;
  }
}
