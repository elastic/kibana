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

  describe('Endpoint Management List', function() {
    this.tags('ciGroup7');
    before(async () => {
      await esArchiver.load('endpoint/endpoints/api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/management');
    });

    it('finds title', async () => {
      const title = await testSubjects.getVisibleText('managementViewTitle');
      expect(title).to.equal('Hosts');
    });

    it('displays table data', async () => {
      const data = await pageObjects.endpoint.getManagementTableData();
      [
        'Hostnamecadmann-4.example.com',
        'PolicyPolicy Name',
        'Policy StatusPolicy Status',
        'Alerts0',
        'Operating Systemwindows 10.0',
        'IP Address10.192.213.130, 10.70.28.129',
        'Sensor Versionversion',
        'Last Activexxxx',
      ].forEach((cellValue, index) => {
        expect(data[1][index]).to.equal(cellValue);
      });
    });

    after(async () => {
      await esArchiver.unload('endpoint/endpoints/api_feature');
    });
  });
};
