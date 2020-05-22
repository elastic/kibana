/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');

  // FLAKY: https://github.com/elastic/kibana/issues/66579
  describe.skip('When on the Endpoint Policy List', function () {
    this.tags(['ciGroup7']);
    before(async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/policy');
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
        'Revision',
        'Version',
        'Description',
        'Agent Configuration',
      ]);
    });
    it('should show empty table results message', async () => {
      const [, [noItemsFoundMessage]] = await pageObjects.endpoint.getEndpointAppTableData(
        'policyTable'
      );
      expect(noItemsFoundMessage).to.equal('No items found');
    });

    xdescribe('and policies exists', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        // load/create a policy and then navigate back to the policy view so that the list is refreshed
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/policy');
        await pageObjects.endpoint.waitForTableToHaveData('policyTable');
      });
      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should show policy on the list', async () => {
        const [, policyRow] = await pageObjects.endpoint.getEndpointAppTableData('policyTable');
        expect(policyRow).to.eql([
          'Protect East Coast',
          '1',
          'Elastic Endpoint v1.0.0',
          'Protect the worlds data - but in the East Coast',
          policyInfo.agentConfig.id,
        ]);
      });
      it('should show policy name as link', async () => {
        const policyNameLink = await testSubjects.find('policyNameLink');
        expect(await policyNameLink.getTagName()).to.equal('a');
        expect(await policyNameLink.getAttribute('href')).to.match(
          new RegExp(`\/endpoint\/policy\/${policyInfo.datasource.id}$`)
        );
      });
      it('should show agent configuration as link', async () => {
        const agentConfigLink = await testSubjects.find('agentConfigLink');
        expect(await agentConfigLink.getTagName()).to.equal('a');
        expect(await agentConfigLink.getAttribute('href')).to.match(
          new RegExp(`\/app\/ingestManager\#\/configs\/${policyInfo.datasource.config_id}$`)
        );
      });
    });
  });
}
