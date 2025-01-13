/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, KibanaUrl, KbnClient } from '@kbn/scout';

export class CustomLogsPage {
  static readonly ASSERTION_MESSAGES = {
    INTEGRATION_NAME_CASE_ERROR: 'An integration name should be lowercase.',
    DATASET_NAME_CASE_ERROR: 'A dataset name should be lowercase.',
    EXISTING_INTEGRATION_ERROR: (name: string) =>
      `Failed to create the integration as an installation with the name ${name} already exists.`,

    DOWNLOADING_AGENT_STATUS: 'Downloading Elastic Agent',
    DOWNLOADED_AGENT_STATUS: 'Elastic Agent downloaded',
    DOWNLOAD_AGENT_DANGER_CALLOUT: 'Download Elastic Agent',
    EXTRACTING_AGENT_STATUS: 'Extracting Elastic Agent',
    EXTRACTED_AGENT_STATUS: 'Elastic Agent extracted',
    EXTRACT_AGENT_DANGER_CALLOUT: 'Extract Elastic Agent',
    INSTALLING_AGENT_STATUS: 'Installing Elastic Agent',
    INSTALLED_AGENT_STATUS: 'Elastic Agent installed',
    INSTALL_AGENT_DANGER_CALLOUT: 'Install Elastic Agent',
    CONNECTING_TO_AGENT_STATUS: 'Connecting to the Elastic Agent',
    CONNECTED_TO_AGENT_STATUS: 'Connected to the Elastic Agent',
    CONNECT_AGENT_WARNING_CALLOUT: 'Connect to the Elastic Agent',
    DOWNLOAD_AGENT_CONFIG_STATUS: 'Downloading Elastic Agent config',
    CONFIGURE_AGENT_WARNING_CALLOUT: 'Configure the agent',
    DOWNLOADING_AGENT_CONFIG_STATUS: 'Downloading Elastic Agent config',
    AGENT_CONFIGURATION_SUCCESS_CALLOUT_MACOS:
      'Elastic Agent config written to /Library/Elastic/Agent/elastic-agent.yml',
    AGENT_CONFIGURATION_SUCCESS_CALLOUT_LINUX:
      'Elastic Agent config written to /opt/Elastic/Agent/elastic-agent.yml',
    INSTALLATION_STEP_2_DISABLED: 'Step 2 is disabled',
  };

  public readonly advancedSettingsContent;
  public readonly logFilePathList;
  public readonly continueButton;
  public readonly addLogFilePathButton;
  public readonly integrationNameInput;
  public readonly datasetNameInput;
  public readonly serviceNameInput;
  public readonly namespaceInput;
  public readonly customConfigInput;
  public readonly customIntegrationSuccessCallout;
  public readonly customIntegrationErrorCallout;
  public readonly apiKeyCreateSuccessCallout;
  public readonly apiKeyPrivilegesErrorCallout;
  public readonly apiKeyCreateErrorCallout;
  public readonly linuxCodeSnippetButton;
  public readonly macOSCodeSnippetButton;
  public readonly windowsCodeSnippetButton;
  public readonly autoDownloadConfigurationToggle;
  public readonly autoDownloadConfigurationCallout;
  public readonly installCodeSnippet;
  public readonly windowsInstallElasticAgentDocLink;
  public readonly configureElasticAgentStep;
  public readonly downloadConfigurationButton;
  public readonly stepStatusLoading;
  public readonly stepStatusComplete;
  public readonly stepStatusDanger;
  public readonly stepStatusWarning;

  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl,
    private readonly kbnClient: KbnClient
  ) {
    this.advancedSettingsContent = this.page.testSubj
      .locator('obltOnboardingCustomLogsAdvancedSettings')
      .getByRole('group');
    this.logFilePathList = this.page.locator(`[data-test-subj^=obltOnboardingLogFilePath-]`);
    this.continueButton = this.page.testSubj.locator('obltOnboardingCustomLogsContinue');
    this.addLogFilePathButton = this.page.testSubj.locator('obltOnboardingCustomLogsAddFilePath');
    this.integrationNameInput = this.page.testSubj.locator(
      'obltOnboardingCustomLogsIntegrationsName'
    );
    this.datasetNameInput = this.page.testSubj.locator('obltOnboardingCustomLogsDatasetName');
    this.serviceNameInput = this.page.testSubj.locator('obltOnboardingCustomLogsServiceName');
    this.namespaceInput = this.page.testSubj.locator('obltOnboardingCustomLogsNamespace');
    this.customConfigInput = this.page.testSubj.locator('obltOnboardingCustomLogsCustomConfig');
    this.customIntegrationSuccessCallout = this.page.testSubj.locator(
      'obltOnboardingCustomIntegrationInstalled'
    );
    this.customIntegrationErrorCallout = this.page.testSubj.locator(
      'obltOnboardingCustomIntegrationErrorCallout'
    );
    this.apiKeyCreateSuccessCallout = this.page.testSubj.locator('obltOnboardingLogsApiKeyCreated');
    this.apiKeyPrivilegesErrorCallout = this.page.testSubj.locator(
      'obltOnboardingLogsApiKeyCreationNoPrivileges'
    );
    this.apiKeyCreateErrorCallout = this.page.testSubj.locator(
      'obltOnboardingLogsApiKeyCreationFailed'
    );
    this.linuxCodeSnippetButton = this.page.testSubj.locator('linux-tar');
    this.macOSCodeSnippetButton = this.page.testSubj.locator('macos');
    this.windowsCodeSnippetButton = this.page.testSubj.locator('windows');
    this.autoDownloadConfigurationToggle = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentAutoDownloadConfig'
    );
    this.autoDownloadConfigurationCallout = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentAutoDownloadConfigCallout'
    );
    this.installCodeSnippet = this.page.testSubj
      .locator('obltOnboardingInstallElasticAgentStep')
      .getByRole('code');
    this.windowsInstallElasticAgentDocLink = this.page.testSubj.locator(
      'obltOnboardingInstallElasticAgentWindowsDocsLink'
    );
    this.configureElasticAgentStep = this.page.testSubj.locator(
      'obltOnboardingConfigureElasticAgentStep'
    );
    this.downloadConfigurationButton = this.page.testSubj.locator(
      'obltOnboardingConfigureElasticAgentStepDownloadConfig'
    );
    this.stepStatusLoading = this.page.testSubj.locator('obltOnboardingStepStatus-loading');
    this.stepStatusComplete = this.page.testSubj.locator('obltOnboardingStepStatus-complete');
    this.stepStatusDanger = this.page.testSubj.locator('obltOnboardingStepStatus-danger');
    this.stepStatusWarning = this.page.testSubj.locator('obltOnboardingStepStatus-warning');
  }

  async goto() {
    this.page.goto(`${this.kbnUrl.app('observabilityOnboarding')}/customLogs`);
  }

  async clickBackButton() {
    await this.page.testSubj.click('observabilityOnboardingFlowBackToSelectionButton');
  }

  logFilePathInput(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePath-${index}`).getByRole('textbox');
  }

  logFilePathDeleteButton(index: number) {
    return this.page.testSubj.locator(`obltOnboardingLogFilePathDelete-${index}`);
  }

  async clickAdvancedSettingsButton() {
    return this.page.testSubj
      .locator('obltOnboardingCustomLogsAdvancedSettings')
      .getByRole('button')
      .first()
      .click();
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
}
