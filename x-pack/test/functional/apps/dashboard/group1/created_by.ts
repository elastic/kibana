/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, security } = getPageObjects(['dashboard', 'security']);

  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const securityService = getService('security');
  const testSubjects = getService('testSubjects');

  describe('created_by', function () {
    const DASHBOARD_NAME = 'veryuniquemydashboardname';
    const USERNAME_1 = 'global_dashboard_all_user_1';
    const USERNAME_2 = 'global_dashboard_all_user_2';

    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );

      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();

      await securityService.role.create('global_dashboard_all_role', {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              dashboard: ['all'],
              visualize: ['all'],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create(USERNAME_1, {
        password: 'changeme',
        roles: ['global_dashboard_all_role'],
        full_name: 'global dashboard all user 1',
      });
      await securityService.user.create(USERNAME_2, {
        password: 'changeme',
        roles: ['global_dashboard_all_role'],
        full_name: 'global dashboard all user 2',
      });

      await security.login(USERNAME_1, 'changeme', {
        expectSpaceSelector: false,
      });

      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        saveAsNew: true,
        waitDialogIsClosed: false,
        exitFromEditMode: false,
      });
      await dashboard.gotoDashboardLandingPage();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await security.forceLogout();
      await securityService.role.delete('global_dashboard_all_role');
      await securityService.user.delete(USERNAME_1);
      await securityService.user.delete(USERNAME_2);

      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it('shows creator column', async () => {
      await testSubjects.existOrFail('tableHeaderCell_createdBy_1');
      await testSubjects.existOrFail(`userAvatarTip-${USERNAME_1}`);
    });

    it('can filter by created_by', async () => {
      await listingTable.expectItemsCount('dashboard', 20);
      await listingTable.selectUsers(USERNAME_1);
      await listingTable.expectItemsCount('dashboard', 1);
      expect(await listingTable.getAllItemsNames()).to.eql([DASHBOARD_NAME]);

      // unselect the user and select "no owner" option
      await listingTable.selectUsers('null', USERNAME_1);
      await listingTable.searchAndExpectItemsCount('dashboard', DASHBOARD_NAME, 0);

      // select the user and unselect "no owner" option
      await listingTable.selectUsers('null', USERNAME_1); // select the user and unselect "no owner" option
      await listingTable.expectItemsCount('dashboard', 1);
    });

    it("doesn't override creator when editing a dashboard", async () => {
      await security.forceLogout();
      await security.login(USERNAME_2, 'changeme', {
        expectSpaceSelector: false,
      });
      await dashboard.navigateToApp();
      await testSubjects.existOrFail('tableHeaderCell_createdBy_1');
      await testSubjects.existOrFail(`userAvatarTip-${USERNAME_1}`);
      await dashboard.gotoDashboardEditMode(DASHBOARD_NAME);
      await dashboard.addVisualizations(['A Pie']);
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        waitDialogIsClosed: false,
        exitFromEditMode: false,
      });
      await dashboard.gotoDashboardLandingPage();
      await testSubjects.existOrFail('tableHeaderCell_createdBy_1');
      await testSubjects.missingOrFail(`userAvatarTip-${USERNAME_2}`);
    });
  });
}
