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
const ENABLE_HOST_RISK_SCORE_BUTTON = '[data-test-subj="enable_host_risk_score"]';
const ENABLE_USER_RISK_SCORE_BUTTON = '[data-test-subj="enable_user_risk_score"]';

export class EntityAnalyticsPage {
  page: Page;
  enableHostRiskScoreBtn!: Locator;
  enableUserRiskScoreBtn!: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  async initialize() {
    this.enableHostRiskScoreBtn = this.page.locator(ENABLE_HOST_RISK_SCORE_BUTTON);
    this.enableUserRiskScoreBtn = this.page.locator(ENABLE_USER_RISK_SCORE_BUTTON);
  }

  async navigates() {
    await this.page.goto(PAGE_URL);
  }

  async enableHostRisk(): Promise<EntityAnalyticsManagementPage> {
    await this.enableHostRiskScoreBtn.click();
    return await PageFactory.createEntityAnalyticsManagementPage(this.page);
  }

  async enableUserRisk(): Promise<EntityAnalyticsManagementPage> {
    await this.enableUserRiskScoreBtn.click();
    return await PageFactory.createEntityAnalyticsManagementPage(this.page);
  }

  async waitForEnableHostRiskScoreToBePresent() {
    await expect(this.enableHostRiskScoreBtn).toBeVisible();
  }

  async waitForEnableUserRiskScoreToBePresent() {
    await expect(this.enableUserRiskScoreBtn).toBeVisible();
  }
}
