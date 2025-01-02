/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, KibanaUrl, KbnClient } from '@kbn/scout';

export class CustomLogsPage {
  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl,
    private readonly kbnClient: KbnClient
  ) {}

  async goto() {
    this.page.goto(`${this.kbnUrl.app('observabilityOnboarding')}/customLogs`);
  }

  async clickBackButton() {
    await this.page.testSubj.click('observabilityOnboardingFlowBackToSelectionButton');
  }

  logFilePathList() {
    return this.page.locator(`[data-test-subj^=obltOnboardingLogFilePath-]`);
  }

  logFilePathInput(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePath-${index}`).getByRole('textbox');
  }

  continueButton() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsContinue');
  }

  addLogFilePathButton() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsAddFilePath');
  }

  logFilePathDeleteButton(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePathDelete-${index}`);
  }

  integrationNameInput() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsIntegrationsName');
  }

  datasetNameInput() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsDatasetName');
  }

  serviceNameInput() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsServiceName');
  }

  async clickAdvancedSettingsButton() {
    return this.page.testSubj
      .locator('obltOnboardingCustomLogsAdvancedSettings')
      .getByRole('button')
      .first()
      .click();
  }

  namespaceInput() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsNamespace');
  }

  customConfigInput() {
    return this.page.testSubj.locator('obltOnboardingCustomLogsCustomConfig');
  }

  async installCustomIntegration(name: string) {
    await this.kbnClient.request({
      method: 'POST',
      path: `/api/fleet/epm/custom_integrations`,
      body: {
        force: true,
        integrationName: name,
        datasets: [
          { name: `${name}.access`, type: 'logs' },
          { name: `${name}.error`, type: 'metrics' },
          { name: `${name}.warning`, type: 'logs' },
        ],
      },
    });
  }

  async deleteIntegration(name: string) {
    const packageInfo = await this.kbnClient.request<{ item: { status: string } }>({
      method: 'GET',
      path: `/api/fleet/epm/packages/${name}`,
      ignoreErrors: [404],
    });

    if (packageInfo.data.item?.status === 'installed') {
      await this.kbnClient.request({
        method: 'DELETE',
        path: `/api/fleet/epm/packages/${name}`,
      });
    }
  }

  async updateInstallationStepStatus(
    onboardingId: string,
    step: string,
    status: string,
    payload?: object
  ) {
    await this.kbnClient.request({
      method: 'POST',
      path: `/internal/observability_onboarding/flow/${onboardingId}/step/${step}`,
      body: {
        status,
        payload,
      },
    });
  }

  customIntegrationSuccessCallout() {
    return this.page.testSubj.locator('obltOnboardingCustomIntegrationInstalled');
  }

  customIntegrationErrorCallout() {
    return this.page.testSubj.locator('obltOnboardingCustomIntegrationErrorCallout');
  }

  apiKeyCreateSuccessCallout() {
    return this.page.testSubj.locator('obltOnboardingLogsApiKeyCreated');
  }

  apiKeyPrivilegesErrorCallout() {
    return this.page.testSubj.locator('obltOnboardingLogsApiKeyCreationNoPrivileges');
  }

  apiKeyCreateErrorCallout() {
    return this.page.testSubj.locator('obltOnboardingLogsApiKeyCreationFailed');
  }

  linuxCodeSnippetButton() {
    return this.page.testSubj.locator('linux-tar');
  }

  macOSCodeSnippetButton() {
    return this.page.testSubj.locator('macos');
  }

  windowsCodeSnippetButton() {
    return this.page.testSubj.locator('windows');
  }

  autoDownloadConfigurationToggle() {
    return this.page.testSubj.locator('obltOnboardingInstallElasticAgentAutoDownloadConfig');
  }

  autoDownloadConfigurationCallout() {
    return this.page.testSubj.locator('obltOnboardingInstallElasticAgentAutoDownloadConfigCallout');
  }

  installCodeSnippet() {
    return this.page.testSubj.locator('obltOnboardingInstallElasticAgentStep').getByRole('code');
  }

  windowsInstallElasticAgentDocLink() {
    return this.page.testSubj.locator('obltOnboardingInstallElasticAgentWindowsDocsLink');
  }

  configureElasticAgentStep() {
    return this.page.testSubj.locator('obltOnboardingConfigureElasticAgentStep');
  }

  downloadConfigurationButton() {
    return this.page.testSubj.locator('obltOnboardingConfigureElasticAgentStepDownloadConfig');
  }

  stepStatusLoading() {
    return this.page.testSubj.locator('obltOnboardingStepStatus-loading');
  }

  stepStatusComplete() {
    return this.page.testSubj.locator('obltOnboardingStepStatus-complete');
  }

  stepStatusDanger() {
    return this.page.testSubj.locator('obltOnboardingStepStatus-danger');
  }

  stepStatusWarning() {
    return this.page.testSubj.locator('obltOnboardingStepStatus-warning');
  }
}
