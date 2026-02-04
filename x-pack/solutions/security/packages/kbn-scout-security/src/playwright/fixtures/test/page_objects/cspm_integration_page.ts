/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { EuiSuperSelectWrapper } from '@kbn/scout/src/playwright/eui_components/super_select';
import {
  AWS_PROVIDER_TEST_SUBJ,
  AZURE_PROVIDER_TEST_SUBJ,
  AWS_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  AWS_SINGLE_ACCOUNT_TEST_SUBJ,
  AZURE_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  AZURE_SINGLE_ACCOUNT_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';
import {
  AZURE_INPUT_FIELDS_TEST_SUBJECTS,
  AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ,
} from '@kbn/fleet-plugin/common';

export class CspmIntegrationPage {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('fleet/integrations/cloud_security_posture/add-integration/cspm');
    // Wait for the provider selector tabs to be visible before continuing
    await this.page
      .getByTestId(AWS_PROVIDER_TEST_SUBJ)
      .waitFor({ state: 'visible', timeout: 30000 });
  }

  async selectProvider(provider: 'aws' | 'azure') {
    const testSubj = provider === 'aws' ? AWS_PROVIDER_TEST_SUBJ : AZURE_PROVIDER_TEST_SUBJ;
    await this.page.getByTestId(testSubj).click();
  }

  async selectAccountType(provider: 'aws' | 'azure', type: 'organization' | 'single') {
    let testSubj: string;
    if (provider === 'aws') {
      testSubj =
        type === 'organization' ? AWS_ORGANIZATION_ACCOUNT_TEST_SUBJ : AWS_SINGLE_ACCOUNT_TEST_SUBJ;
    } else {
      testSubj =
        type === 'organization'
          ? AZURE_ORGANIZATION_ACCOUNT_TEST_SUBJ
          : AZURE_SINGLE_ACCOUNT_TEST_SUBJ;
    }
    await this.page.getByTestId(testSubj).click();
  }

  async selectSetupTechnology(tech: 'agentless' | 'agent-based') {
    await this.page
      .getByTestId('setup-technology-selector')
      .locator(`input[value='${tech}']`)
      .click();
  }

  async fillCloudConnectorName(name: string) {
    await this.page.getByTestId(CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ).fill(name);
  }

  async fillAwsCloudConnectorDetails(roleArn: string, externalId?: string) {
    await this.page.getByTestId(AWS_INPUT_TEST_SUBJECTS.ROLE_ARN).fill(roleArn);

    // External ID field is optional and may not be present
    if (externalId) {
      const externalIdField = this.page.getByTestId(AWS_INPUT_TEST_SUBJECTS.EXTERNAL_ID);
      const isVisible = await externalIdField.isVisible().catch(() => false);
      if (isVisible) {
        await externalIdField.fill(externalId);
      }
    }
  }

  async fillAzureCloudConnectorDetails(tenantId: string, clientId: string, credentialsId: string) {
    await this.page.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID).fill(tenantId);
    await this.page.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID).fill(clientId);
    await this.page
      .getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
      .fill(credentialsId);
  }

  async selectExistingCloudConnector(provider: 'aws' | 'azure', connectorName: string) {
    // When existing cloud connectors are present, the UI defaults to the "Existing Connection" tab
    // which shows a super select dropdown to choose from existing connectors
    const selectTestSubj =
      provider === 'aws'
        ? AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ
        : AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ;

    // Use EUI wrapper for reliable super select interaction
    const superSelect = new EuiSuperSelectWrapper(this.page, { dataTestSubj: selectTestSubj });

    // Open the dropdown
    await superSelect.toggleDropdown();

    // Find and click the option by visible text (connector names are dynamic)
    const dropdown = this.page.locator('[role="listbox"]');
    await dropdown.waitFor({ state: 'visible' });
    await dropdown.locator(`[role="option"]`).filter({ hasText: connectorName }).click();

    // Wait for dropdown to close
    await dropdown.waitFor({ state: 'detached' });
  }

  async fillIntegrationName(name: string) {
    await this.page.locator('input[id="name"]').fill(name);
  }

  async saveIntegration() {
    await this.page.getByTestId('createPackagePolicySaveButton').click();
  }

  async saveAgentBasedIntegration() {
    await this.page.getByTestId('createPackagePolicySaveButton').click();
    const cloudFormationModal = this.page.getByTestId('postInstallCloudFormationModal');
    const armTemplateModal = this.page.getByTestId('postInstallAzureArmTemplateModal');
    const addAgentModal = this.page.getByTestId('postInstallAddAgentModal');

    await cloudFormationModal.or(armTemplateModal).or(addAgentModal).waitFor({ state: 'visible' });
  }
}
