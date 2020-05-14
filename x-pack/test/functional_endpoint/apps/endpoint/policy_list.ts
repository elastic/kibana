/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');

  describe('When on the Endpoint Policy List', function() {
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
  });
}
