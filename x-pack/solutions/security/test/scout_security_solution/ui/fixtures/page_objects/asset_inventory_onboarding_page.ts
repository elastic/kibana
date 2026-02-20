/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const ASSET_INVENTORY_INTEGRATION_URL =
  '/app/fleet/integrations/cloud_asset_inventory/add-integration';

export class AssetInventoryOnboardingPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(ASSET_INVENTORY_INTEGRATION_URL);
  }

  async gotoIntegrationsBrowse() {
    await this.page.goto('/app/integrations/browse');
  }

  get saveButton() {
    return this.page.testSubj.locator('createPackagePolicySaveButton');
  }

  get addElasticAgentLaterButton() {
    return this.page.testSubj.locator('confirmModalCancelButton');
  }

  get policyNameInput() {
    return this.page.locator('#name');
  }

  awsSingleAccountInput() {
    return this.page.testSubj.locator('awsSingleTestId').locator('input');
  }

  awsOrganizationAccountInput() {
    return this.page.testSubj.locator('awsOrganizationTestId').locator('input');
  }

  awsManualSetupInput() {
    return this.page.testSubj.locator('aws-manual-setup-option').locator('input');
  }

  awsCloudFormationInput() {
    return this.page.testSubj.locator('aws-cloudformation-setup-option').locator('input');
  }

  awsCredentialsSelector() {
    return this.page.testSubj.locator('aws-credentials-type-selector');
  }

  awsRoleArnInput() {
    return this.page.testSubj.locator('awsRoleArnInput');
  }

  awsTemporaryKeysAccessKeyId() {
    return this.page.testSubj.locator('awsTemporaryKeysAccessKeyId');
  }

  awsTemporaryKeysSessionToken() {
    return this.page.testSubj.locator('awsTemporaryKeysSessionToken');
  }

  passwordInputSecretAccessKey() {
    return this.page.locator('[data-test-subj="passwordInput-secret-access-key"]');
  }

  caiAwsTestIdInput() {
    return this.page.testSubj.locator('caiAwsTestId').locator('input');
  }

  caiAzureTestIdInput() {
    return this.page.testSubj.locator('caiAzureTestId').locator('input');
  }

  caiGcpTestIdInput() {
    return this.page.testSubj.locator('caiGcpTestId').locator('input');
  }

  confirmCloudFormationModalCancelButton() {
    return this.page.testSubj.locator('confirmCloudFormationModalCancelButton');
  }

  confirmAzureArmTemplateModalCancelButton() {
    return this.page.testSubj.locator('confirmAzureArmTemplateModalCancelButton');
  }

  confirmGoogleCloudShellModalCancelButton() {
    return this.page.testSubj.locator('confirmGoogleCloudShellModalCancelButton');
  }

  azureCredentialsTypeSelector() {
    return this.page.testSubj.locator('azure-credentials-type-selector');
  }

  caiAzureArmTemplateInput() {
    return this.page.testSubj.locator('caiAzureArmTemplate').locator('input');
  }

  gcpGoogleCloudShellOptionTestIdInput() {
    return this.page.testSubj.locator('gcpGoogleCloudShellOptionTestId').locator('input');
  }

  gcpSingleAccountTestIdInput() {
    return this.page.testSubj.locator('gcpSingleAccountTestId').locator('input');
  }

  gcpOrganizationAccountTestIdInput() {
    return this.page.testSubj.locator('gcpOrganizationAccountTestId').locator('input');
  }

  gcpManualOptionTestIdInput() {
    return this.page.testSubj.locator('gcpManualOptionTestId').locator('input');
  }

  organizationIdTestId() {
    return this.page.testSubj.locator('organization_id_test_id');
  }

  projectIdTestId() {
    return this.page.testSubj.locator('project_id_test_id');
  }

  credentialsTypeTestId() {
    return this.page.testSubj.locator('credentials_type_test_id');
  }

  credentialsJsonTextArea() {
    return this.page.testSubj.locator('textAreaInput-credentials-json');
  }

  launchGoogleCloudShellAgentlessButton() {
    return this.page.testSubj.locator('launchGoogleCloudShellAgentlessButton');
  }

  async toggleIntegrationsSwitch() {
    await this.page.locator('button[role="switch"]').first().click();
  }

  async changePolicyName(suffix: string) {
    const name = `${suffix} ${Date.now()}`;
    await this.policyNameInput.clear();
    await this.policyNameInput.fill(name);
    return name;
  }

  policyLinkLocator(policyName: string) {
    return this.page.locator(`a[title="${policyName}"]`);
  }
}
