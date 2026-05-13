/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/entity_analytics';

export class EntityAnalyticsDashboardsPage {
  public entityStoreEnablementPanel: Locator;
  public entityStoreEnablementButton: Locator;
  public entityStoreEnablementModal: Locator;
  public enablementRiskScoreSwitch: Locator;
  public enablementEntityStoreSwitch: Locator;
  public entitiesListPanel: Locator;
  public entityStoreEnablementModalButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.entityStoreEnablementPanel = this.page.testSubj.locator('entityStoreEnablementPanel');
    this.entityStoreEnablementButton = this.page.testSubj.locator('entityStoreEnablementButton');
    this.entityStoreEnablementModal = this.page.testSubj.locator('entityStoreEnablementModal');
    this.enablementRiskScoreSwitch = this.page.testSubj.locator('enablementRiskScoreSwitch');
    this.enablementEntityStoreSwitch = this.page.testSubj.locator('enablementEntityStoreSwitch');
    this.entitiesListPanel = this.page.testSubj.locator('entitiesListPanel');
    this.entityStoreEnablementModalButton = this.page.testSubj.locator(
      'entityStoreEnablementModalButton'
    );
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async openEntityStoreEnablementModal() {
    await this.entityStoreEnablementButton.click();
  }

  async confirmEntityStoreEnablement() {
    await this.entityStoreEnablementModalButton.click();
  }

  async waitForEntitiesListToAppear() {
    await this.entitiesListPanel.waitFor({ state: 'visible' });
    await this.entitiesListPanel.scrollIntoViewIfNeeded();
  }
}
