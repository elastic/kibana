/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/** Entity Analytics Management page (risk engine, entity store settings) */
export class EntityAnalyticsManagementPage {
  constructor(private readonly page: ScoutPage) {}

  get pageTitle(): Locator {
    return this.page.testSubj.locator('entityAnalyticsManagementPageTitle');
  }

  get riskPreviewError(): Locator {
    return this.page.testSubj.locator('risk-preview-error');
  }

  get riskPreviewErrorButton(): Locator {
    return this.page.testSubj.locator('risk-preview-error-button');
  }

  get riskScoreErrorPanel(): Locator {
    return this.page.testSubj.locator('risk-score-error-panel');
  }

  get riskScoreStatus(): Locator {
    return this.page.testSubj.locator('risk-score-status');
  }

  get riskScoreStatusLoading(): Locator {
    return this.page.testSubj.locator('risk-score-status-loading');
  }

  get riskScorePrivilegesCallout(): Locator {
    return this.page.testSubj.locator('callout-missing-risk-engine-privileges');
  }

  get riskScoreSwitch(): Locator {
    return this.page.testSubj.locator('risk-score-switch');
  }

  get riskScorePreviewPrivilegesCallout(): Locator {
    return this.page.testSubj.locator('missing-risk-engine-preview-permissions');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_management');
  }

  async clickRiskEngineSwitch(): Promise<void> {
    await this.riskScoreSwitch.first().click();
  }

  async clickPreviewErrorButton(): Promise<void> {
    await this.riskPreviewErrorButton.first().click();
  }
}

/** Asset Criticality upload page */
export class EntityAnalyticsAssetCriticalityPage {
  constructor(private readonly page: ScoutPage) {}

  get pageTitle(): Locator {
    return this.page.testSubj.locator('entityStoreManagementPage');
  }

  get filePicker(): Locator {
    return this.page.testSubj.locator('asset-criticality-file-picker');
  }

  get assignButton(): Locator {
    return this.page.testSubj.locator('asset-criticality-assign-button');
  }

  get resultStep(): Locator {
    return this.page.testSubj.locator('asset-criticality-result-step-success');
  }

  get validLinesMessage(): Locator {
    return this.page.testSubj.locator('asset-criticality-validLinesMessage');
  }

  get invalidLinesMessage(): Locator {
    return this.page.testSubj.locator('asset-criticality-invalidLinesMessage');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_asset_criticality');
  }

  async uploadFile(buffer: Buffer, fileName = 'asset_criticality.csv'): Promise<void> {
    await this.filePicker.first().setInputFiles({
      name: fileName,
      mimeType: 'text/csv',
      buffer,
    });
  }

  async clickAssign(): Promise<void> {
    await this.assignButton.first().click();
  }
}

/** Entity flyout - asset criticality in user/host flyout */
export class EntityAnalyticsFlyoutPage {
  constructor(private readonly page: ScoutPage) {}

  get assetCriticalitySelector(): Locator {
    return this.page.testSubj.locator('asset-criticality-selector');
  }

  get assetCriticalityButton(): Locator {
    return this.page.testSubj.locator('asset-criticality-change-btn');
  }

  get assetCriticalityModalTitle(): Locator {
    return this.page.testSubj.locator('asset-criticality-modal-title');
  }

  get assetCriticalityLevel(): Locator {
    return this.page.testSubj.locator('asset-criticality-level');
  }

  get assetCriticalityBadge(): Locator {
    return this.page.testSubj.locator('risk-inputs-asset-criticality-badge');
  }

  get riskInputPanelHeader(): Locator {
    return this.page.testSubj.locator('securitySolutionFlyoutRiskInputsTab');
  }

  get riskInputsTitleLink(): Locator {
    return this.page.testSubj.locator('riskInputsTitleLink');
  }

  get assetCriticalityModalSelect(): Locator {
    return this.page.testSubj.locator('asset-criticality-modal-select');
  }

  get assetCriticalityModalSaveBtn(): Locator {
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

/** Threat Hunting page */
export class EntityAnalyticsThreatHuntingPage {
  constructor(private readonly page: ScoutPage) {}

  get pageTitle(): Locator {
    return this.page.testSubj.locator('threatHuntingPage');
  }

  get combinedRiskDonutChart(): Locator {
    return this.page.testSubj.locator('risk-score-donut-chart');
  }

  get anomaliesPlaceholderPanel(): Locator {
    return this.page.testSubj.locator('anomalies-placeholder-panel');
  }

  get threatHuntingEntitiesTable(): Locator {
    return this.page.locator('[data-test-subj*="threat-hunting-entities-table-loading"]');
  }

  get threatHuntingEntitiesTableLoaded(): Locator {
    return this.page.testSubj.locator('threat-hunting-entities-table-loading-false');
  }

  get timelineIcon(): Locator {
    return this.page.testSubj.locator('threat-hunting-timeline-icon');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_threat_hunting');
  }
}

/** Privileged User Monitoring page */
export class EntityAnalyticsPrivMonPage {
  constructor(private readonly page: ScoutPage) {}

  get onboardingPanel(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringOnboardingPanel');
  }

  get onboardingCallout(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringOnboardingCallout');
  }

  get oktaIntegrationCard(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-okta-integration-card');
  }

  get filePicker(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-file-picker');
  }

  get addIndexCard(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringAddIndexCard');
  }

  get validationStep(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-validation-step');
  }

  get importCsvCard(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringImportCSVCard');
  }

  get assignButton(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-assign-button');
  }

  get updateButton(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-update-button');
  }

  get createIndexButton(): Locator {
    return this.page.testSubj.locator('create-index-button');
  }

  get createIndexModalIndexName(): Locator {
    return this.page.testSubj.locator('createIndexModalIndexName');
  }

  get createIndexModalCreateButton(): Locator {
    return this.page.testSubj.locator('createIndexModalCreateButton');
  }

  get comboBoxToggleListButton(): Locator {
    return this.page.testSubj.locator('comboBoxToggleListButton');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_privileged_user_monitoring');
  }

  async clickOktaCard(): Promise<void> {
    await this.oktaIntegrationCard.first().click();
  }
}

/** Risk information flyout (host details) */
export class EntityAnalyticsRiskInfoPage {
  constructor(private readonly page: ScoutPage) {}

  get openRiskInformationFlyoutButton(): Locator {
    return this.page.testSubj.locator('open-risk-information-flyout-trigger');
  }

  get riskInformationFlyoutHeader(): Locator {
    return this.page.locator('[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader');
  }

  async openRiskInformationFlyout(): Promise<void> {
    await this.openRiskInformationFlyoutButton.first().click();
  }
}
