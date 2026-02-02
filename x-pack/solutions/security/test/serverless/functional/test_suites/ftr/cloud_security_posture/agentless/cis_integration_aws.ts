/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type * as http from 'http';
import {
  AWS_PROVIDER_TEST_SUBJ,
  AWS_SINGLE_ACCOUNT_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'settings',
    'common',
    'svlCommonPage',
    'cisAddIntegration',
    'header',
  ]);
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('Serverless - Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let mockApiServer: http.Server;

    before(async () => {
      const { setupMockServer } = await import('./mock_agentless_api');
      const mockAgentlessApiService = setupMockServer();
      mockApiServer = mockAgentlessApiService.listen(8089);

      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
    });

    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/cloud_security_posture`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      mockApiServer.close();
    });

    describe('Serverless - Agentless CIS_AWS Single Account Launch Cloud formation', () => {
      it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();
        await pageObjects.header.waitUntilLoadingHasFinished();

        await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_SUBJ);

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
      it(`should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmPage();
        await pageObjects.header.waitUntilLoadingHasFinished();

        await cisIntegration.clickOptionButton(AWS_PROVIDER_TEST_SUBJ);
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
          AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID,
          'newDirectAccessKey'
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(
            AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID,
            'value'
          )
        ).to.be(newDirectAccessKeyId);
        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
      });
    });

    // turned back on after the fix for fleet form bug https://github.com/elastic/kibana/pull/211563 - need to monitor
    describe('Serverless - Agentless CIS_AWS Create flow', () => {
      it(`user should save agentless integration policy when there are no api or validation errors and button is not disabled`, async () => {
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'aws',
        });
        await retry.try(async () => {
          expect(await cisIntegration.showSuccessfulToast('packagePolicyCreateSuccessToast')).to.be(
            true
          );
        });
      });
    });
  });
}
