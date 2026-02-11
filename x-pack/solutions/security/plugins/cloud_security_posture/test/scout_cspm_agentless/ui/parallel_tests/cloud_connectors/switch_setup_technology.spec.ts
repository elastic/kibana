/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
  AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AZURE_INPUT_FIELDS_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';

import type { CreateAgentlessPolicyRequest } from '@kbn/fleet-plugin/common/types/rest_spec/agentless_policy';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  mockAgentPoliciesCreate,
  mockAgentlessPoliciesWithCapture,
  mockPackagePoliciesEmpty,
  mockPackagePoliciesEmptyWithCapture,
} from '../../fixtures/mocks';

// Use the Fleet plugin's typed request body
type AgentlessPolicyRequestBody = CreateAgentlessPolicyRequest['body'];

spaceTest.describe(
  'Cloud Connectors - Switch Setup Technology',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Use admin for stateful tests (has all permissions including fleet-cloud-connector)
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.cloudConnectorApi.deleteAllCloudConnectors();
    });

    spaceTest(
      'AWS CSPM - Switch FROM cloud connectors to direct access keys',
      async ({ pageObjects, page }) => {
        const integrationName = `aws-cspm-direct-${Date.now()}`;
        let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

        // Mock the package policy list API (GET request needed for form initialization)
        await mockPackagePoliciesEmpty(page);

        // Set up route interception for agentless policies API
        // Use regex to match URL with query parameters and space prefixes
        await mockAgentlessPoliciesWithCapture(page, (body) => {
          capturedRequestBody = body;
        });

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('aws');
        await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Cloud connectors is selected by default, now switch to direct access keys
        const credentialsSelect = page.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        await credentialsSelect.waitFor({ state: 'visible' });
        await credentialsSelect.selectOption('direct_access_keys');

        // Fill direct access credentials
        await page
          .getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID)
          .fill('test-access-key-id');
        await page
          .getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY)
          .fill('test-secret-key');
        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Wait for the request to be captured by polling
        await expect
          .poll(() => capturedRequestBody, {
            message: 'Waiting for agentless policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        // Verify the request was captured
        expect(capturedRequestBody).not.toBeNull();

        // Verify request details
        expect(capturedRequestBody!.name).toBe(integrationName);

        // Validate AWS stream input vars: supports_cloud_connectors should NOT be present or true
        expect(capturedRequestBody!.inputs).toBeDefined();
        const awsInputKey = Object.keys(capturedRequestBody!.inputs!).find((key) =>
          key.includes('cis_aws')
        );
        expect(awsInputKey).toBeDefined();

        const awsInput = capturedRequestBody!.inputs![awsInputKey!];
        const findingsStream = awsInput.streams!['cloud_security_posture.findings'];
        expect(findingsStream).toBeDefined();
        expect(findingsStream.vars).toBeDefined();

        // supports_cloud_connectors should NOT exist or be true in vars
        expect(
          findingsStream.vars &&
            Object.prototype.hasOwnProperty.call(findingsStream.vars, 'supports_cloud_connectors')
        ).toBe(false);

        // Ensure the cloud_connector object itself is not present
        expect(capturedRequestBody!.cloud_connector).toBeUndefined();

        // Key assertion: cloud_connector is NOT present when using direct access keys
        expect(capturedRequestBody!.cloud_connector).toBeUndefined();
      }
    );

    spaceTest(
      'Azure CSPM - Switch FROM cloud connectors to service principal with client secret',
      async ({ pageObjects, page }) => {
        const integrationName = `azure-cspm-sp-${Date.now()}`;
        let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

        // Mock the package policy list API (GET request needed for form initialization)
        await mockPackagePoliciesEmpty(page);

        // Set up route interception for agentless policies API
        await mockAgentlessPoliciesWithCapture(page, (body) => {
          capturedRequestBody = body;
        });

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('azure');
        await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Cloud connectors is selected by default, now switch to service principal with client secret
        const credentialsSelect = page.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        await credentialsSelect.waitFor({ state: 'visible' });
        await credentialsSelect.selectOption('service_principal_with_client_secret');

        // Fill service principal credentials
        await page.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID).fill('test-tenant-id');
        await page.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID).fill('test-client-id');
        await page
          .getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
          .fill('test-client-secret');

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Wait for the request to be captured by polling
        await expect
          .poll(() => capturedRequestBody, {
            message: 'Waiting for agentless policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        // Verify the request was captured
        expect(capturedRequestBody).not.toBeNull();
        expect(capturedRequestBody!.name).toBe(integrationName);

        // Validate Azure stream input vars
        expect(capturedRequestBody!.inputs).toBeDefined();
        const azureInputKey = Object.keys(capturedRequestBody!.inputs!).find((key) =>
          key.includes('cis_azure')
        );
        expect(azureInputKey).toBeDefined();

        const azureInput = capturedRequestBody!.inputs![azureInputKey!];
        const findingsStream = azureInput.streams!['cloud_security_posture.findings'];
        expect(findingsStream).toBeDefined();
        expect(findingsStream.vars).toBeDefined();

        // Credential type should be service_principal_with_client_secret
        expect(findingsStream.vars!['azure.credentials.type']).toBe(
          'service_principal_with_client_secret'
        );

        // Key assertion: cloud_connector should NOT be present when using service principal
        expect(capturedRequestBody!.cloud_connector).toBeUndefined();
      }
    );

    spaceTest(
      'AWS CSPM - Switch FROM cloud connectors to agent-based',
      async ({ pageObjects, page }) => {
        const integrationName = `aws-cspm-agent-${Date.now()}`;
        let agentlessPolicyRequestCaptured = false;
        let packagePolicyRequestBody: Record<string, unknown> | null = null;

        // Set up ALL mocks BEFORE navigation (order preserved)
        await Promise.all([
          // 1. Intercept agentless (should NOT be called)
          page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
            if (request.method() === 'POST') agentlessPolicyRequestCaptured = true;
            await route.continue();
          }),

          // 2. Mock agent policies (agent-based flow)
          mockAgentPoliciesCreate(page),

          // 3. Mock package policies (GET empty + capture POST)
          mockPackagePoliciesEmptyWithCapture(page, (body) => {
            packagePolicyRequestBody = body;
            return { item: { id: `mock-${Date.now()}`, ...body } };
          }),
        ]);

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('aws');
        await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');

        // Switch setup technology to agent-based (default is agentless with cloud connectors)
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agent-based');

        // Wait for form state to stabilize after setup technology change
        const saveButton = page.getByTestId('createPackagePolicySaveButton');
        await saveButton.waitFor({ state: 'visible' });

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // Wait for the save button to be enabled before clicking
        await expect(saveButton).toBeEnabled({ timeout: 10000 });

        await pageObjects.cspmIntegrationPage.saveAgentBasedIntegration();

        // Wait for the package policy request to be captured
        await expect
          .poll(() => packagePolicyRequestBody, {
            message: 'Waiting for package policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        expect(agentlessPolicyRequestCaptured).toBe(false);
        expect(packagePolicyRequestBody).not.toBeNull();

        // Policy root should NOT have cloud_connector
        expect(packagePolicyRequestBody!.cloud_connector).toBeUndefined();

        // Policy root should NOT have supports_cloud_connectors
        expect(packagePolicyRequestBody!.supports_cloud_connectors).toBeUndefined();

        // Policy should NOT have supports_agentless: true
        expect(packagePolicyRequestBody!.supports_agentless).not.toBe(true);

        // Validate stream vars do NOT have aws.supports_cloud_connectors set to true
        const inputs = packagePolicyRequestBody!.inputs as Array<{
          type: string;
          streams?: Array<{ vars?: Record<string, unknown> }>;
        }>;
        const awsInput = inputs?.find((input) => input.type?.includes('cis_aws'));
        // Collect all aws.supports_cloud_connectors values from streams (should all be falsy or undefined)
        const awsSupportsCloudConnectorsValues = (awsInput?.streams ?? []).map(
          (stream) => stream.vars?.['aws.supports_cloud_connectors']
        );
        // None of the values should be true
        expect(awsSupportsCloudConnectorsValues.every((val) => val !== true)).toBe(true);
      }
    );

    spaceTest(
      'Azure CSPM - Switch FROM cloud connectors to agent-based',
      async ({ pageObjects, page }) => {
        const integrationName = `azure-cspm-agent-${Date.now()}`;
        let agentlessPolicyRequestCaptured = false;
        let packagePolicyRequestBody: Record<string, unknown> | null = null;

        // Set up ALL mocks BEFORE navigation (order preserved)
        await Promise.all([
          // 1. Intercept agentless (should NOT be called)
          page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
            if (request.method() === 'POST') agentlessPolicyRequestCaptured = true;
            await route.continue();
          }),

          // 2. Mock agent policies (agent-based flow)
          mockAgentPoliciesCreate(page),

          // 3. Mock package policies (GET empty + capture POST)
          mockPackagePoliciesEmptyWithCapture(page, (body) => {
            packagePolicyRequestBody = body;
            return { item: { id: `mock-${Date.now()}`, ...body } };
          }),
        ]);

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('azure');
        await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');

        // Switch setup technology to agent-based (default is agentless with cloud connectors)
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agent-based');

        // Wait for form state to stabilize after setup technology change
        const saveButton = page.getByTestId('createPackagePolicySaveButton');
        await saveButton.waitFor({ state: 'visible' });

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // Wait for the save button to be enabled before clicking
        await expect(saveButton).toBeEnabled({ timeout: 10000 });

        await pageObjects.cspmIntegrationPage.saveAgentBasedIntegration();

        // Wait for the package policy request to be captured
        await expect
          .poll(() => packagePolicyRequestBody, {
            message: 'Waiting for package policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        expect(agentlessPolicyRequestCaptured).toBe(false);
        expect(packagePolicyRequestBody).not.toBeNull();

        // Policy root should NOT have cloud_connector
        expect(packagePolicyRequestBody!.cloud_connector).toBeUndefined();

        // Policy root should NOT have supports_cloud_connectors
        expect(packagePolicyRequestBody!.supports_cloud_connectors).toBeUndefined();

        // Policy should NOT have supports_agentless: true
        expect(packagePolicyRequestBody!.supports_agentless).not.toBe(true);

        // Validate stream vars do NOT have azure.supports_cloud_connectors set to true
        const inputs = packagePolicyRequestBody!.inputs as Array<{
          type: string;
          streams?: Array<{ vars?: Record<string, unknown> }>;
        }>;
        const azureInput = inputs?.find((input) => input.type?.includes('cis_azure'));
        // Collect all azure.supports_cloud_connectors values from streams (should all be falsy or undefined)
        const azureSupportsCloudConnectorsValues = (azureInput?.streams ?? []).map(
          (stream) => stream.vars?.['azure.supports_cloud_connectors']
        );
        // None of the values should be true
        expect(azureSupportsCloudConnectorsValues.every((val) => val !== true)).toBe(true);
      }
    );
  }
);
