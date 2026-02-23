/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/** Entity flyout - asset criticality in user/host flyout */
export class EntityAnalyticsFlyoutPage {
  constructor(private readonly page: ScoutPage) {}

  public get assetCriticalitySelector(): Locator {
    return this.page.testSubj.locator('asset-criticality-selector');
  }

  public get assetCriticalityButton(): Locator {
    return this.page.testSubj.locator('asset-criticality-change-btn');
  }

  public get assetCriticalityModalTitle(): Locator {
    return this.page.testSubj.locator('asset-criticality-modal-title');
  }

  public get assetCriticalityLevel(): Locator {
    return this.page.testSubj.locator('asset-criticality-level');
  }

  public get assetCriticalityBadge(): Locator {
    return this.page.testSubj.locator('risk-inputs-asset-criticality-badge');
  }

  public get riskInputPanelHeader(): Locator {
    return this.page.testSubj.locator('securitySolutionFlyoutRiskInputsTab');
  }

  public get riskInputsTitleLink(): Locator {
    return this.page.testSubj.locator('riskInputsTitleLink');
  }

  public get assetCriticalityModalSelect(): Locator {
    return this.page.testSubj.locator('asset-criticality-modal-select');
  }

  public get assetCriticalityModalSaveBtn(): Locator {
    return this.page.testSubj.locator('asset-criticality-modal-save-btn');
  }

  async toggleAssetCriticalityModal(): Promise<void> {
    await this.assetCriticalityButton.first().click();
  }

  async expandRiskInputsPanel(): Promise<void> {
    await this.riskInputsTitleLink.first().click();
  }

  async selectAssetCriticalityLevel(option: string): Promise<void> {
    await this.toggleAssetCriticalityModal();
    await this.assetCriticalityModalSelect.first().click();
    await this.page.getByRole('option', { name: option }).first().click();
    await this.assetCriticalityModalSaveBtn.first().click();
  }
}
