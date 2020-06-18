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
    'ingestManagerCreateDatasource',
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
      const policyTitle = await testSubjects.getVisibleText('pageViewHeaderLeftTitle');
      expect(policyTitle).to.equal('Policies');
    });
    it('shows header create policy button', async () => {
      const createButtonTitle = await testSubjects.getVisibleText('headerCreateNewPolicyButton');
      expect(createButtonTitle).to.equal('Create new policy');
    });
    it('shows policy count total', async () => {
      const policyTotal = await testSubjects.getVisibleText('policyTotalCount');
      expect(policyTotal).to.equal('0 Policies');
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
    it('should show empty table results message', async () => {
      const [, [noItemsFoundMessage]] = await pageObjects.endpointPageUtils.tableData(
        'policyTable'
      );
      expect(noItemsFoundMessage).to.equal('No items found');
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

      it('should show policy on the list', async () => {
        const [, policyRow] = await pageObjects.endpointPageUtils.tableData('policyTable');
        // Validate row data with the exception of the Date columns - since those are initially
        // shown as relative.
        expect([policyRow[0], policyRow[1], policyRow[3], policyRow[5], policyRow[6]]).to.eql([
          'Protect East Coastrev. 1',
          'elastic',
          'elastic',
          `${policyInfo.datasource.package?.title} v${policyInfo.datasource.package?.version}`,
          '',
        ]);
        [policyRow[2], policyRow[4]].forEach((relativeDate) => {
          expect(relativeDate).to.match(RELATIVE_DATE_FORMAT);
        });
      });

      it('should show agent config action as a link', async () => {
        await (await pageObjects.policy.findFirstActionsButton()).click();
        const agentConfigLink = await testSubjects.find('agentConfigLink');
        expect(await agentConfigLink.getAttribute('href')).to.match(
          new RegExp(`\/ingestManager#\/configs\/${policyInfo.agentConfig.id}$`)
        );
        // Close action menu
        await (await pageObjects.policy.findFirstActionsButton()).click();
      });

      it('should delete a policy', async () => {
        await pageObjects.policy.launchAndFindDeleteModal();
        await testSubjects.existOrFail('policyListDeleteModal');
        await pageObjects.common.clickConfirmOnModal();
        await pageObjects.endpoint.waitForTableToNotHaveData('policyTable');
        const policyTotal = await testSubjects.getVisibleText('policyTotalCount');
        expect(policyTotal).to.equal('0 Policies');
      });
    });

    describe('and user clicks on page header create button', () => {
      beforeEach(async () => {
        await pageObjects.policy.navigateToPolicyList();
        await (await pageObjects.policy.findHeaderCreateNewButton()).click();
      });

      it('should redirect to ingest management integrations add datasource', async () => {
        await pageObjects.ingestManagerCreateDatasource.ensureOnCreatePageOrFail();
      });

      it('should redirect user back to Policy List if Cancel button is clicked', async () => {
        await (await pageObjects.ingestManagerCreateDatasource.findCancelButton()).click();
        await pageObjects.policy.ensureIsOnPolicyPage();
      });

      it('should redirect user back to Policy List if Back link is clicked', async () => {
        await (await pageObjects.ingestManagerCreateDatasource.findBackLink()).click();
        await pageObjects.policy.ensureIsOnPolicyPage();
      });

      it('should display custom endpoint configuration message', async () => {
        await pageObjects.ingestManagerCreateDatasource.selectAgentConfig();
        const endpointConfig = await pageObjects.policy.findDatasourceEndpointCustomConfiguration();
        expect(endpointConfig).not.to.be(undefined);
      });

      it('should redirect user back to Policy List after a successful save', async () => {
        const newPolicyName = `endpoint policy ${Date.now()}`;
        await pageObjects.ingestManagerCreateDatasource.selectAgentConfig();
        await pageObjects.ingestManagerCreateDatasource.setDatasourceName(newPolicyName);
        await (await pageObjects.ingestManagerCreateDatasource.findDSaveButton()).click();
        await pageObjects.ingestManagerCreateDatasource.waitForSaveSuccessNotification();
        await pageObjects.policy.ensureIsOnPolicyPage();
        await policyTestResources.deletePolicyByName(newPolicyName);
      });
    });
  });
}
