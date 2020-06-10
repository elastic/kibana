/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint', 'policy']);
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
    it('shows policy count total', async () => {
      const policyTotal = await testSubjects.getVisibleText('policyTotalCount');
      expect(policyTotal).to.equal('0 Policies');
    });
    it('has correct table headers', async () => {
      const allHeaderCells = await pageObjects.endpoint.tableHeaderVisibleText('policyTable');
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
      const [, [noItemsFoundMessage]] = await pageObjects.endpoint.getEndpointAppTableData(
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
        const [, policyRow] = await pageObjects.endpoint.getEndpointAppTableData('policyTable');
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
      it('should show policy name as link', async () => {
        const policyNameLink = await testSubjects.find('policyNameLink');
        expect(await policyNameLink.getTagName()).to.equal('a');
        expect(await policyNameLink.getAttribute('href')).to.match(
          new RegExp(`\/management\/policy\/${policyInfo.datasource.id}$`)
        );
      });
    });
  });
}
