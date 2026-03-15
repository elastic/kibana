/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

const AWS_ACCESS_KEY = 'test-temporary-access-key';
const AWS_SECRET_KEY = 'test-temporary-secret-key';
const AWS_TEMPORARY_SESSION = 'test-temporary-key-session';

test.describe(
  'Asset Inventory integration onboarding - AWS',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save a package policy with AWS Cloud Formation', async ({ pageObjects, page }) => {
      const po = pageObjects.assetInventoryOnboarding;
      const policyName = await po.changePolicyName('asset_inventory-cloudformation');

      await expect(po.awsOrganizationAccountInput().first()).toBeChecked();
      await expect(po.awsCloudFormationInput().first()).toBeChecked();
      await expect(po.saveButton.first()).toBeEnabled();

      await po.awsSingleAccountInput().first().click();
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.confirmCloudFormationModalCancelButton().first().click();

      await po.policyLinkLocator(policyName).first().click();
      await expect(po.policyNameInput).toHaveValue(policyName);
    });

    test('should save a package policy with role ARNs', async ({ pageObjects }) => {
      const po = pageObjects.assetInventoryOnboarding;
      const policyName = await po.changePolicyName('asset_inventory-role-arns');
      const arns = 'arn:aws:iam::123456789012:role/test-role';

      await po.awsSingleAccountInput().first().click();
      await po.awsManualSetupInput().first().click();
      await expect(po.saveButton.first()).toBeDisabled();

      await po.awsRoleArnInput().first().fill(arns);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.addElasticAgentLaterButton.first().click();

      await po.policyLinkLocator(policyName).first().click();
      await expect(po.awsRoleArnInput().first()).toHaveValue(arns);
    });

    test('should save a package policy with temporary keys', async ({ pageObjects }) => {
      const po = pageObjects.assetInventoryOnboarding;
      const policyName = await po.changePolicyName('asset_inventory-temporary-keys');

      await po.awsSingleAccountInput().first().click();
      await po.awsManualSetupInput().first().click();
      await po.awsCredentialsSelector().first().selectOption('temporary_keys');

      await po.awsTemporaryKeysAccessKeyId().first().fill(AWS_ACCESS_KEY);
      await po.awsTemporaryKeysSessionToken().first().fill(AWS_TEMPORARY_SESSION);
      await po.passwordInputSecretAccessKey().first().fill(AWS_SECRET_KEY);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
      await po.addElasticAgentLaterButton.first().click();

      await po.policyLinkLocator(policyName).first().click();
      await expect(po.awsTemporaryKeysAccessKeyId().first()).toHaveValue(AWS_ACCESS_KEY);
    });
  }
);

test.describe(
  'Asset Inventory Agentless integration onboarding - AWS',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.assetInventoryOnboarding.gotoIntegrationsBrowse();
      await pageObjects.assetInventoryOnboarding.toggleIntegrationsSwitch();
      await pageObjects.assetInventoryOnboarding.goto();
    });

    test('should save a single agentless package policy with temporary keys', async ({
      pageObjects,
    }) => {
      const po = pageObjects.assetInventoryOnboarding;
      await po.changePolicyName('asset_inventory-agentless-temporary-keys');

      await po.awsSingleAccountInput().first().click();
      await expect(po.saveButton.first()).toBeDisabled();

      await po.awsCredentialsSelector().first().selectOption('temporary_keys');
      await po.awsTemporaryKeysAccessKeyId().first().fill(AWS_ACCESS_KEY);
      await po.passwordInputSecretAccessKey().first().fill(AWS_SECRET_KEY);
      await po.awsTemporaryKeysSessionToken().first().fill(AWS_TEMPORARY_SESSION);
      await expect(po.saveButton.first()).toBeEnabled();
      await po.saveButton.first().click();
    });
  }
);
