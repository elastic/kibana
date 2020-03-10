/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('Endpoint Host List', function() {
    this.tags('ciGroup7');
    before(async () => {
      await esArchiver.load('endpoint/metadata/api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/hosts');
    });

    it('finds title', async () => {
      const title = await testSubjects.getVisibleText('hostListTitle');
      expect(title).to.equal('Hosts');
    });

    it('displays table data', async () => {
      const expectedData = [
        [
          'Hostname',
          'Policy',
          'Policy Status',
          'Alerts',
          'Operating System',
          'IP Address',
          'Sensor Version',
          'Last Active',
        ],
        [
          'Host-cxz5glsoup',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 6.2',
          '10.48.181.222, 10.116.62.62, 10.102.83.30',
          'version',
          'xxxx',
        ],
        [
          'Host-frl2otafoa',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 10.0',
          '10.198.70.21, 10.252.10.66, 10.128.235.38',
          'version',
          'xxxx',
        ],
        [
          'Host-abmfhmc5ku',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 6.2',
          '10.100.170.247, 10.113.203.29, 10.83.81.146',
          'version',
          'xxxx',
        ],
      ];
      const tableData = await pageObjects.endpoint.getEndpointAppTableData('hostListTable');
      expect(tableData).to.eql(expectedData);
    });

    it('displays no items found', async () => {
      // clear out the data and reload the page
      await esArchiver.unload('endpoint/metadata/api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/hosts');
      // get the table data and verify no entries appear
      const tableData = await pageObjects.endpoint.getEndpointAppTableData('hostListTable');
      expect(tableData[1][0]).to.equal('No items found');
      // reload the data so the other tests continue to pass
      await esArchiver.load('endpoint/metadata/api_feature');
    });

    after(async () => {
      await esArchiver.unload('endpoint/metadata/api_feature');
    });
    describe('when on the details page', function() {
      // details flyout is shown
      // data matches mock
      // clicking on the endpoint list changes/not
      // navigating to a url with an id
      this.tags('ciGroup7');
      before(async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory(
          'endpoint',
          '/hosts/?selected_host=de5bf078-c247-4944-a198-6e2bc27e0b7b'
        );
      });

      it('displays shows a flyout', async () => {
        return (flyout = await testSubjects.find('hostDetailsFlyout'));
      });
    });
  });
};
