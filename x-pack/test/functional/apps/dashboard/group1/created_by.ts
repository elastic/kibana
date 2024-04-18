/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'lens', 'timePicker']);

  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');

  describe('created_by', function () {
    const DASHBOARD_NAME = 'veryuniquemydashboardname';
    // this is the user that will be used to create the dashboard
    const username = config.get('security.disableTestUser')
      ? (config.get('servers.kibana.username') as string)
      : 'test_user';
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(DASHBOARD_NAME, {
        waitDialogIsClosed: false,
        exitFromEditMode: false,
      });
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
    });

    it('can filter by created_by', async () => {
      await listingTable.expectItemsCount('dashboard', 20);
      await listingTable.selectUsers(username);
      await listingTable.expectItemsCount('dashboard', 1);
      expect(await listingTable.getAllItemsNames()).to.eql([DASHBOARD_NAME]);

      // unselect the user and select "no owner" option
      await listingTable.selectUsers('null', username);
      await listingTable.searchAndExpectItemsCount('dashboard', DASHBOARD_NAME, 0);

      // select the user and unselect "no owner" option
      await listingTable.selectUsers('null', username); // select the user and unselect "no owner" option
      await listingTable.expectItemsCount('dashboard', 1);
    });
  });
}
