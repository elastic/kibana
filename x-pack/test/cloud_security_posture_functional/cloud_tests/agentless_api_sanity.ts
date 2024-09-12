/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import type { FtrProviderContext } from '../ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const pageObjects = getPageObjects(['common', 'header', 'cisAddIntegration', 'findings']);

  // let cisIntegration: typeof pageObjects.cisAddIntegration;
  // let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;

  describe('Agentless Cloud - Sanity Tests', function () {
    // before(async () => {
    //   cisIntegration = pageObjects.cisAddIntegration;
    //   cisIntegrationAws = pageObjects.cisAddIntegration.cisAws; // Start the usage api mock server on port 8081
    // });

    it(`should have been collected`, async () => {
      const findings = pageObjects.findings;

      await findings.navigateToLatestFindingsPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await queryBar.setQuery('agent.name : *agentless*');
      await queryBar.submitQuery();

      const agentlessFindingsRowsCount = await findings
        .createDataTableObject('latest_findings_table')
        .getRowsCount();

      expect(agentlessFindingsRowsCount).to.be.greaterThan(0);
    });

    // Tech Debt: The following test is disabled until the delete agentless agent task is done
    // https://github.com/elastic/kibana/issues/174598

    // it(`should create agentless-agent for AWS single account`, async () => {
    //   const agentlessIntegrationAwsName = `cloud_security_posture-agentless-aws-sanity-${new Date().toISOString()}`;
    //   const agentlessAgentAwsPolicyName = `Agentless policy for ${agentlessIntegrationAwsName}`;

    //   await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
    //     CLOUD_CREDENTIALS_PACKAGE_VERSION
    //   );

    //   await cisIntegration.clickOptionButton(cisIntegration.testSubjectIds.CIS_AWS_OPTION_TEST_ID);
    //   await cisIntegration.clickOptionButton(
    //     cisIntegration.testSubjectIds.AWS_SINGLE_ACCOUNT_TEST_ID
    //   );

    //   await cisIntegration.inputIntegrationName(agentlessIntegrationAwsName);

    //   await cisIntegration.selectSetupTechnology('agentless');
    //   await cisIntegration.selectAwsCredentials('direct');

    //   await pageObjects.header.waitUntilLoadingHasFinished();

    //   await cisIntegration.clickSaveButton();
    //   await pageObjects.header.waitUntilLoadingHasFinished();

    //   expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);

    //   await cisIntegration.navigateToIntegrationCspList();
    //   await pageObjects.header.waitUntilLoadingHasFinished();

    //   expect(await cisIntegration.getFirstCspmIntegrationPageIntegration()).to.be(
    //     agentlessIntegrationAwsName
    //   );
    //   expect(await cisIntegration.getFirstCspmIntegrationPageAgent()).to.be(
    //     agentlessAgentAwsPolicyName
    //   );

    //   // Delete the agentless agent when the following task is done
    //   // https://github.com/elastic/kibana/issues/174598
    // });
  });
}
