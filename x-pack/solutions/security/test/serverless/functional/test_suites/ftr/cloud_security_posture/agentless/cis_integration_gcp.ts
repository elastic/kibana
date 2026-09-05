/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as http from 'http';
import {
  GCP_PROVIDER_TEST_SUBJ,
  GCP_SINGLE_ACCOUNT_TEST_SUBJ,
  GCP_INPUT_FIELDS_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);

  const supertest = getService('supertest');

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let mockApiServer: http.Server;

    before(async () => {
      const { setupMockServer } = await import('./mock_agentless_api');
      const mockAgentlessApiService = setupMockServer();
      mockApiServer = mockAgentlessApiService.listen(8089);

      // Ensure CSP is installed — prior suites in this FTR config (e.g. cis_integration_aws)
      // delete the package in their after hook, so we can't rely on the server-args preinstall.
      await supertest
        .post('/api/fleet/epm/packages/cloud_security_posture')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
    });

    after(async () => {
      try {
        await supertest
          .delete(`/api/fleet/epm/packages/cloud_security_posture`)
          .set('kbn-xsrf', 'xxxx')
          .query({ force: true })
          .expect(200);
      } finally {
        await new Promise<void>((resolve) => mockApiServer.close(() => resolve()));
      }
    });

    describe('Agentless CIS_GCP Single Account Launch Cloud shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();

        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);

        await cisIntegration.selectSetupTechnology('agentless');

        // When GCP Cloud Connectors are enabled (package >= 3.3.0-preview03), the form defaults
        // to the cloud_connectors credential type. Switch to credentials-json to show the
        // Cloud Shell button — same pattern used by the AWS test with selectAwsCredentials('direct').
        if (await cisIntegration.isGcpCredentialSelectorVisible()) {
          await cisIntegration.selectGcpCredentials('credentials-json');
        }

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });

    describe('Agentless CIS_GCP ORG Account Launch Cloud Shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();

        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.selectSetupTechnology('agentless');

        // Same as above — switch away from cloud_connectors when the selector is visible.
        if (await cisIntegration.isGcpCredentialSelectorVisible()) {
          await cisIntegration.selectGcpCredentials('credentials-json');
        }

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });

    describe('Serverless - Agentless CIS_GCP edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newCredentialsJSON = 'newJson';
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'gcp',
        });
        await cisIntegration.editAgentlessIntegration(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
          newCredentialsJSON
        );

        // Project ID is frozen on edit. Credentials JSON is a secret, so after save the
        // plaintext is hidden and a Replace button is shown instead of the field value.
        expect(
          await cisIntegration.getFieldAttributeValue(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
            'disabled'
          )
        ).to.be('true');
        expect(await cisIntegration.showCredentialJsonSecretPanel()).to.be(true);
        expect(await cisIntegration.getReplaceSecretButton('credentials-json')).to.not.be(null);
        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });
  });
}
