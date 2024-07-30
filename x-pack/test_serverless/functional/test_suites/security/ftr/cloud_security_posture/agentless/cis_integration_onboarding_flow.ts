/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SETUP_TECHNOLOGY_SELECTOR = 'setup-technology-selector';
const DIRECT_ACCESS_KEY_ID_TEST_ID = 'awsDirectAccessKeyId';
const PRJ_ID_TEST_ID = 'project_id_test_id';
const CREDENTIALS_JSON_TEST_ID = 'textAreaInput-credentials-json';

import expect from '@kbn/expect';

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const pageObjects = getPageObjects([
    'settings',
    'common',
    'svlCommonPage',
    'cisAddIntegration',
    'header',
  ]);

  // Skiping test until we are able access configure fleet api to work with e2e tests
  describe('Agentless Edit flow - CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;

    before(async () => {
      await pageObjects.svlCommonPage.login();

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
    });

    after(async () => {
      await supertest
        .delete(
          `/api/fleet/epm/packages/cloud_security_posture/${CLOUD_CREDENTIALS_PACKAGE_VERSION}`
        )
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await pageObjects.svlCommonPage.forceLogout();
    });
    // Skip Serverless test until we configure fleet api
    describe('Serverless Agentless CIS_AWS edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newDirectAccessKeyId = `newDirectAccessKey`;

        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'aws',
        });

        await cisIntegration.editAgentlessIntegration(
          DIRECT_ACCESS_KEY_ID_TEST_ID,
          'newDirectAccessKey'
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(DIRECT_ACCESS_KEY_ID_TEST_ID, 'value')
        ).to.be(newDirectAccessKeyId);
        expect(await cisIntegrationAws.showLaunchCloudFormationAgentlessButton()).to.be(true);
        expect(await cisIntegration.getElementText(SETUP_TECHNOLOGY_SELECTOR)).to.be('Agentless');
        expect(
          await cisIntegration.getFieldAttributeValue(SETUP_TECHNOLOGY_SELECTOR, 'disabled')
        ).to.be('true');
      });
    });

    describe('Serverless Agentless CIS_GCP edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newCredentialsJSON = 'newJson';
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'gcp',
        });
        await cisIntegration.editAgentlessIntegration(CREDENTIALS_JSON_TEST_ID, newCredentialsJSON);

        // assert the form values are saved
        expect(await cisIntegration.getFieldAttributeValue(PRJ_ID_TEST_ID, 'disabled')).to.be(
          'true'
        );
        expect(
          await cisIntegration.getFieldAttributeValue(CREDENTIALS_JSON_TEST_ID, 'value')
        ).to.be(newCredentialsJSON);
        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
        expect(await cisIntegration.getElementText(SETUP_TECHNOLOGY_SELECTOR)).to.be('Agentless');
        expect(
          await cisIntegration.getFieldAttributeValue(SETUP_TECHNOLOGY_SELECTOR, 'disabled')
        ).to.be('true');
      });
    });
  });
}
