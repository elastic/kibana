/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import * as http from 'http';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from '../../../constants';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { setupMockServer } from './mock_agentless_api';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);

  const supertest = getService('supertest');

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let testSubjectIds: typeof pageObjects.cisAddIntegration.testSubjectIds;

    const mockAgentlessApiService = setupMockServer();
    let mockApiServer: http.Server;

    before(async () => {
      mockApiServer = mockAgentlessApiService.listen(8089);
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
      testSubjectIds = pageObjects.cisAddIntegration.testSubjectIds;
    });

    after(async () => {
      await supertest
        .delete(
          `/api/fleet/epm/packages/cloud_security_posture/${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`
        )
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      mockApiServer.close();
    });

    describe('Agentless CIS_GCP Single Account Launch Cloud shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(testSubjectIds.GCP_SINGLE_ACCOUNT_TEST_ID);

        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });
    });

    describe('Agentless CIS_GCP ORG Account Launch Cloud Shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
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
          testSubjectIds.CREDENTIALS_JSON_TEST_ID,
          newCredentialsJSON
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(testSubjectIds.PRJ_ID_TEST_ID, 'disabled')
        ).to.be('true');
        expect(
          await cisIntegration.getFieldAttributeValue(
            testSubjectIds.CREDENTIALS_JSON_TEST_ID,
            'value'
          )
        ).to.be(newCredentialsJSON);
      });
    });
  });
}
