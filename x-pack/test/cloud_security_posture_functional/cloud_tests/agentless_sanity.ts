/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const queryBar = getService('queryBar');
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
    'findings',
    'fleet',
  ]);

  describe('Agentless Cloud - Sanity Tests', function () {
    describe('agentless agent health', function () {
      it(`should be healthy`, async () => {
        const AGENTLESS_POLICY_NAME_PREFIX = 'Agentless policy for';
        const AGENT_NAME_PREFIX = 'agentless-';
        const HEALTHY_STATUS = 'Healthy';
        const fleet = pageObjects.fleet;

        await fleet.navigateToFleetAgentsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();

        await (await testSubjects.find('agentList.policyFilter')).click();

        const options = await testSubjects.findAll('agentList.agentPolicyFilterOption');

        // Click the first agentless policy
        for (const option of options) {
          if ((await option.getVisibleText()).includes(AGENTLESS_POLICY_NAME_PREFIX)) {
            await option.click();
            break;
          }
        }

        // The agent is healthy
        const agentHealthSpan = await find.byCssSelector(`span[title='${HEALTHY_STATUS}']`);
        expect(agentHealthSpan).not.to.empty();

        const agentTableLinks = await find.allByCssSelector('tbody a');

        // The agent has enrolled with Fleet
        const host = await agentTableLinks[0].getVisibleText();
        expect(host).to.be.contain(AGENT_NAME_PREFIX);

        // The integration policy is applied
        const policy = await agentTableLinks[1].getVisibleText();
        expect(policy).to.contain(AGENTLESS_POLICY_NAME_PREFIX);
      });
    });

    describe('agentless agent findings', function () {
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
    });

    // Tech Debt: The following test is disabled until the delete agentless agent task is done
    // https://github.com/elastic/kibana/issues/174598

    // describe('create and delete Agentless agent', function () {
    // let cisIntegration: typeof pageObjects.cisAddIntegration;
    // let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;

    // before(async () => {
    //   cisIntegration = pageObjects.cisAddIntegration;
    //   cisIntegrationAws = pageObjects.cisAddIntegration.cisAws; // Start the usage api mock server on port 8081
    // });
    //   it(`should create agentless-agent for AWS single account`, async () => {
    //     const agentlessIntegrationAwsName = `cloud_security_posture-agentless-aws-sanity-${new Date().toISOString()}`;
    //     const agentlessAgentAwsPolicyName = `Agentless policy for ${agentlessIntegrationAwsName}`;

    //     await cisIntegration.navigateToAddIntegrationCspmWithVersionPage(
    //       CLOUD_CREDENTIALS_PACKAGE_VERSION
    //     );

    //     await cisIntegration.clickOptionButton(
    //       cisIntegration.testSubjectIds.CIS_AWS_OPTION_TEST_ID
    //     );
    //     await cisIntegration.clickOptionButton(
    //       cisIntegration.testSubjectIds.AWS_SINGLE_ACCOUNT_TEST_ID
    //     );

    //     await cisIntegration.inputIntegrationName(agentlessIntegrationAwsName);

    //     await cisIntegration.selectSetupTechnology('agentless');
    //     await cisIntegration.selectAwsCredentials('direct');

    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     await cisIntegration.clickSaveButton();
    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     expect(await cisIntegrationAws.showPostInstallCloudFormationModal()).to.be(false);

    //     await cisIntegration.navigateToIntegrationCspList();
    //     await pageObjects.header.waitUntilLoadingHasFinished();

    //     expect(await cisIntegration.getFirstCspmIntegrationPageIntegration()).to.be(
    //       agentlessIntegrationAwsName
    //     );
    //     expect(await cisIntegration.getFirstCspmIntegrationPageAgent()).to.be(
    //       agentlessAgentAwsPolicyName
    //     );

    //     // Delete the agentless agent when the following task is done
    //     // https://github.com/elastic/kibana/issues/174598
    //   });
    // });
  });
}
