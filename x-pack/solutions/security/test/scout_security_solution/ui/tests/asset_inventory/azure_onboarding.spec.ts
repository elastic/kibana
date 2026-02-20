/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

const AZURE_CLIENT_ID = 'azure-client-id';
const AZURE_TENANT_ID = 'azure-tenant-id';
const AZURE_CLIENT_SECRET = 'azure-client-secret';

test.describe(
  'Asset Inventory integration onboarding - Azure',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save an organization account package policy with ARM template', async ({
      pageObjects,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiAzureTestIdInput().first().click();

      const policyName = await po.changePolicyName('asset_inventory-azure-organization-arm-template');

      await expect(po.caiAzureArmTemplateInput().first()).toBeChecked();
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.confirmAzureArmTemplateModalCancelButton().first().click();

      await po.policyLinkLocator(policyName).first().click();
      await expect(po.policyNameInput).toHaveValue(policyName);
    });

    test('should save an organization package policy with client secret', async ({
      pageObjects,
      page,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiAzureTestIdInput().first().click();

      const policyName = await po.changePolicyName('asset_inventory-azure-organization-client-secret');

      await po.azureCredentialsTypeSelector().first().selectOption('service_principal_with_client_secret');
      await page.locator('#azure\\.credentials\\.client_id').first().fill(AZURE_CLIENT_ID);
      await page.locator('#azure\\.credentials\\.tenant_id').first().fill(AZURE_TENANT_ID);
      await page.locator('[data-test-subj="passwordInput-client-secret"]').first().fill(AZURE_CLIENT_SECRET);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.addElasticAgentLaterButton.first().click();

      await po.policyLinkLocator(policyName).first().click();
    });
  }
);

test.describe(
  'Asset Inventory Agentless integration onboarding - Azure',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save an organization package policy', async ({
      pageObjects,
      page,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.caiAzureTestIdInput().first().click();

      await po.changePolicyName('asset_inventory-azure-agentless');
      await page.locator('#azure\\.credentials\\.client_id').first().fill(AZURE_CLIENT_ID);
      await page.locator('#azure\\.credentials\\.tenant_id').first().fill(AZURE_TENANT_ID);
      await page.locator('[data-test-subj="passwordInput-client-secret"]').first().fill(AZURE_CLIENT_SECRET);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
    });
  }
);
