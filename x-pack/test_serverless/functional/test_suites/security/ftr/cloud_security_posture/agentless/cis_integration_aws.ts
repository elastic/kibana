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
  const mockAgentlessApiService = setupMockServer();
  const pageObjects = getPageObjects([
    'settings',
    'common',
    'svlCommonPage',
    'cisAddIntegration',
    'header',
  ]);
  const supertest = getService('supertest');

  describe('Serverless - Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let testSubjectIds: typeof pageObjects.cisAddIntegration.testSubjectIds;
    let mockApiServer: http.Server;

    before(async () => {
      mockApiServer = mockAgentlessApiService.listen(8089);
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
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

    describe('Serverless - Agentless CIS_AWS Single Account Launch Cloud formation', () => {
      it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(testSubjectIds.AWS_SINGLE_ACCOUNT_TEST_ID);

        await cisIntegration.inputIntegrationName(
          `cloud_security_posture-${new Date().toISOString()}`
        );

        await cisIntegration.selectSetupTechnology('agentless');

        await cisIntegration.selectAwsCredentials('direct');

        expect(
          (await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(true);
      });
    });

    describe('Serverless - Agentless CIS_AWS ORG Account Launch Cloud formation', () => {
      it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await cisIntegration.selectAwsCredentials('direct');

        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
      });
    });

    describe('Serverless - Agentless CIS_AWS edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newDirectAccessKeyId = `newDirectAccessKey`;

        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'aws',
        });

        await cisIntegration.editAgentlessIntegration(
          testSubjectIds.DIRECT_ACCESS_KEY_ID_TEST_ID,
          'newDirectAccessKey'
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(
            testSubjectIds.DIRECT_ACCESS_KEY_ID_TEST_ID,
            'value'
          )
        ).to.be(newDirectAccessKeyId);
        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
      });
    });
    // FLAKY: https://github.com/elastic/kibana/issues/191017
    describe.skip('Serverless - Agentless CIS_AWS Create flow', () => {
      it(`user should save agentless integration policy when there are no api or validation errors and button is not disabled`, async () => {
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'aws',
        });

        expect(await cisIntegration.showSuccessfulToast('packagePolicyCreateSuccessToast')).to.be(
          true
        );
      });
    });
  });
}
