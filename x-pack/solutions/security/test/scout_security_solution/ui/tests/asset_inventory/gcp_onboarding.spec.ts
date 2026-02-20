/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

const GCP_ORGANIZATION_ID = 'org-123456789012';
const GCP_PROJECT_ID = 'project-123456789012';
const GCP_CREDENTIALS_JSON =
  '{ "type": "service_account", "project_id": "project-123456789012", "private_key_id": "key-id", "private_key": "-----BEGIN PRIVATE KEY-----\\FakEpRIVateKey...\\n-----END PRIVATE KEY-----\\n", "client_email": "test@example.com" }';

test.describe(
  'Asset Inventory integration onboarding - GCP',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save a package policy with GCP Cloud Shell', async ({
      pageObjects,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiGcpTestIdInput().first().click();

      const policyName = await po.changePolicyName('asset_inventory-gcp-cloudshell');

      await expect(po.gcpGoogleCloudShellOptionTestIdInput().first()).toBeChecked();
      await expect(po.saveButton.first()).toBeEnabled();

      await po.gcpSingleAccountTestIdInput().first().click();
      await po.gcpOrganizationAccountTestIdInput().first().click();
      await po.organizationIdTestId().first().fill(GCP_ORGANIZATION_ID);
      await po.projectIdTestId().first().fill(GCP_PROJECT_ID);

      await po.saveButton.first().click();
      await po.confirmGoogleCloudShellModalCancelButton().first().click();

      await po.policyLinkLocator(policyName).first().click();
      await expect(po.policyNameInput).toHaveValue(policyName);
    });

    test('should save a package policy with credentials JSON', async ({
      pageObjects,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiGcpTestIdInput().first().click();

      const policyName = await po.changePolicyName('asset_inventory-gcp-credentials-json');

      await po.gcpSingleAccountTestIdInput().first().click();
      await po.gcpManualOptionTestIdInput().first().click();
      await po.projectIdTestId().first().fill(GCP_PROJECT_ID);
      await po.credentialsTypeTestId().first().selectOption('credentials-json');
      await po.credentialsJsonTextArea().first().fill(GCP_CREDENTIALS_JSON);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.addElasticAgentLaterButton.first().click();

      await po.policyLinkLocator(policyName).first().click();
    });
  }
);

test.describe(
  'Asset Inventory Agentless integration onboarding - GCP',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save an agentless package policy with single account type', async ({
      pageObjects,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiGcpTestIdInput().first().click();

      await po.changePolicyName('asset_inventory-gcp-agentless-single');
      await expect(po.launchGoogleCloudShellAgentlessButton().first()).toBeVisible();

      await po.gcpSingleAccountTestIdInput().first().click();
      await po.projectIdTestId().first().fill(GCP_PROJECT_ID);
      await po.credentialsJsonTextArea().first().fill(GCP_CREDENTIALS_JSON);

      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
    });
  }
);
