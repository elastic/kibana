/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'policy',
    'endpointPageUtils',
    'ingestManagerCreatePackagePolicy',
  ]);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');
  const RELATIVE_DATE_FORMAT = /\d (?:seconds|minutes) ago/i;

  describe('When on the Endpoint Policy List', function () {
    this.tags(['ciGroup7']);
    before(async () => {
      await pageObjects.policy.navigateToPolicyList();
    });

    it('loads the Policy List Page', async () => {
      await testSubjects.existOrFail('policyListPage');
    });
    it('displays page title', async () => {
      const policyTitle = await testSubjects.getVisibleText('header-page-title');
      expect(policyTitle).to.equal('Policies');
    });
    it('shows header create policy button', async () => {
      const createButtonTitle = await testSubjects.getVisibleText('headerCreateNewPolicyButton');
      expect(createButtonTitle).to.equal('Create new policy');
    });
    it('shows empty state', async () => {
      await testSubjects.existOrFail('emptyPolicyTable');
    });

    describe('and policies exists', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        // load/create a policy and then navigate back to the policy view so that the list is refreshed
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyList();
        await pageObjects.endpoint.waitForTableToHaveData('policyTable');
      });
      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('has correct table headers', async () => {
        const allHeaderCells = await pageObjects.endpointPageUtils.tableHeaderVisibleText(
          'policyTable'
        );
        expect(allHeaderCells).to.eql([
          'Policy Name',
          'Created By',
          'Created Date',
          'Last Updated By',
          'Last Updated',
          'Version',
          'Actions',
        ]);
      });

      it('should show policy on the list', async () => {
        const [, policyRow] = await pageObjects.endpointPageUtils.tableData('policyTable');
        // Validate row data with the exception of the Date columns - since those are initially
        // shown as relative.
        expect([policyRow[0], policyRow[1], policyRow[3], policyRow[5], policyRow[6]]).to.eql([
          'Protect East Coastrev. 1',
          'elastic',
          'elastic',
          `v${policyInfo.packagePolicy.package?.version}`,
          '',
        ]);
        [policyRow[2], policyRow[4]].forEach((relativeDate) => {
          expect(relativeDate).to.match(RELATIVE_DATE_FORMAT);
        });
      });

      it('should show agent policy action as a link', async () => {
        await (await pageObjects.policy.findFirstActionsButton()).click();
        const agentPolicyLink = await testSubjects.find('agentPolicyLink');
        expect(await agentPolicyLink.getAttribute('href')).to.match(
          new RegExp(`\/ingestManager#\/policies\/${policyInfo.agentPolicy.id}$`)
        );
        // Close action menu
        await (await pageObjects.policy.findFirstActionsButton()).click();
      });

      it('should delete a policy', async () => {
        await pageObjects.policy.launchAndFindDeleteModal();
        await testSubjects.existOrFail('policyListDeleteModal');
        await pageObjects.common.clickConfirmOnModal();
        const emptyPolicyTable = await testSubjects.find('emptyPolicyTable');
        expect(emptyPolicyTable).not.to.be(null);
      });
    });

    describe('and user clicks on page header create button', () => {
      beforeEach(async () => {
        await pageObjects.policy.navigateToPolicyList();
        await (await pageObjects.policy.findHeaderCreateNewButton()).click();
      });

      it('should redirect to ingest management integrations add package policy', async () => {
        await pageObjects.ingestManagerCreatePackagePolicy.ensureOnCreatePageOrFail();
      });

      it('should redirect user back to Policy List if Cancel button is clicked', async () => {
        await (await pageObjects.ingestManagerCreatePackagePolicy.findCancelButton()).click();
        await pageObjects.policy.ensureIsOnPolicyPage();
      });

      it('should redirect user back to Policy List if Back link is clicked', async () => {
        await (await pageObjects.ingestManagerCreatePackagePolicy.findBackLink()).click();
        await pageObjects.policy.ensureIsOnPolicyPage();
      });

      it('should display custom endpoint configuration message', async () => {
        await pageObjects.ingestManagerCreatePackagePolicy.selectAgentPolicy();
        const endpointConfig = await pageObjects.policy.findPackagePolicyEndpointCustomConfiguration();
        expect(endpointConfig).not.to.be(undefined);
      });

      it('should have empty value for package policy name', async () => {
        await pageObjects.ingestManagerCreatePackagePolicy.selectAgentPolicy();
        expect(await pageObjects.ingestManagerCreatePackagePolicy.getPackagePolicyName()).to.be('');
      });

      it('should redirect user back to Policy List after a successful save', async () => {
        const newPolicyName = `endpoint policy ${Date.now()}`;
        await pageObjects.ingestManagerCreatePackagePolicy.selectAgentPolicy();
        await pageObjects.ingestManagerCreatePackagePolicy.setPackagePolicyName(newPolicyName);
        await (await pageObjects.ingestManagerCreatePackagePolicy.findDSaveButton()).click();
        await pageObjects.ingestManagerCreatePackagePolicy.waitForSaveSuccessNotification();
        await pageObjects.policy.ensureIsOnPolicyPage();
        await policyTestResources.deletePolicyByName(newPolicyName);
      });
    });

    describe('and user clicks on page header create button', () => {
      it('should direct users to the ingest management integrations add package policy', async () => {
        await pageObjects.policy.navigateToPolicyList();
        await (await pageObjects.policy.findOnboardingStartButton()).click();
        await pageObjects.ingestManagerCreatePackagePolicy.ensureOnCreatePageOrFail();
      });
    });
  });
}
