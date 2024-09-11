/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);

  const supertest = getService('supertest');
  const previousPackageVersion = '1.9.0';

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let testSubjectIds: typeof pageObjects.cisAddIntegration.testSubjectIds;

    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
      testSubjectIds = pageObjects.cisAddIntegration.testSubjectIds;
    });

    after(async () => {
      await supertest
        .delete(
          `/api/fleet/epm/packages/cloud_security_posture/${CLOUD_CREDENTIALS_PACKAGE_VERSION}`
        )
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    describe('Agentless CIS_GCP Single Account Launch Cloud shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          CLOUD_CREDENTIALS_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(testSubjectIds.GCP_SINGLE_ACCOUNT_TEST_ID);

        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });

      it(`should hide CIS_GCP Launch Cloud Shell button when package version is less than ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(testSubjectIds.GCP_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(false);
      });
    });

    describe('Agentless CIS_GCP ORG Account Launch Cloud Shell', () => {
      it(`should show CIS_GCP Launch Cloud Shell button when package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
          CLOUD_CREDENTIALS_PACKAGE_VERSION
        );

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
      });

      it(`should hide CIS_GCP Launch Cloud shell button when package version is ${previousPackageVersion}`, async () => {
        await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(previousPackageVersion);

        await cisIntegration.clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
        await cisIntegration.selectSetupTechnology('agentless');

        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(false);
      });
    });

    describe('Serverless - Agentless CIS_GCP edit flow', () => {
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
        expect(await cisIntegrationGcp.showLaunchCloudShellAgentlessButton()).to.be(true);
        expect(await cisIntegration.getElementText(testSubjectIds.SETUP_TECHNOLOGY_SELECTOR)).to.be(
          'Agentless\nBETA'
        );
        expect(
          await cisIntegration.getFieldAttributeValue(
            testSubjectIds.SETUP_TECHNOLOGY_SELECTOR,
            'disabled'
          )
        ).to.be('true');
      });
    });
  });
}
