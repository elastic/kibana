/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator, Page, expect } from '@playwright/test';
import { EntityAnalyticsManagementPage } from './entity_analytics_management_po';
import { PageFactory } from './page_factory';

const PAGE_URL = '/app/security/entity_analytics';
const ENABLE_RISK_ENGINE_BUTTON = '[data-test-subj="enable_risk_score"]';

export class EntityAnalyticsPage {
  page: Page;
  enableRiskEngineBtn!: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  async initialize() {
    this.enableRiskEngineBtn = this.page.locator(ENABLE_RISK_ENGINE_BUTTON);
  }

  async navigates() {
    await this.page.goto(PAGE_URL);
  }

  async enableRiskEngine(): Promise<EntityAnalyticsManagementPage> {
    await this.enableRiskEngineBtn.click();
    return await PageFactory.createEntityAnalyticsManagementPage(this.page);
  }

  async waitForEnableRiskEngineToBePresent() {
    await expect(this.enableRiskEngineBtn).toBeVisible();
  }
}
