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

      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
    });

    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/cloud_security_posture`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      mockApiServer.close();
    });

    describe('Agentless CIS_GCP Single Account Launch Cloud shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();

        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(GCP_SINGLE_ACCOUNT_TEST_SUBJ);

        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });

    describe('Agentless CIS_GCP ORG Account Launch Cloud Shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();

        await cisIntegration.clickOptionButton(GCP_PROVIDER_TEST_SUBJ);
        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });

    describe.skip('Serverless - Agentless CIS_GCP edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newCredentialsJSON = 'newJson';
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'gcp',
        });
        await cisIntegration.editAgentlessIntegration(
          GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
          newCredentialsJSON
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID,
            'disabled'
          )
        ).to.be('true');
        expect(
          await cisIntegration.getFieldAttributeValue(
            GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON,
            'value'
          )
        ).to.be(newCredentialsJSON);
      });
    });
  });
}
