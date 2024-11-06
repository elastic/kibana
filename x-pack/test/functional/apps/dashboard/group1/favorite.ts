/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, security } = getPageObjects(['dashboard', 'security']);

  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const securityService = getService('security');
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('favorites', function () {
    const USERNAME = 'dashboard_read_user';
    const ROLE = 'dashboard_read_role';
    const customSpace = 'custom_space';

    before(async () => {
      await esArchiver.emptyKibanaIndex();

      await spaces.create({
        id: customSpace,
        name: customSpace,
        disabledFeatures: [],
      });
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/custom_space',
        { space: customSpace }
      );

      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();

      await securityService.role.create(ROLE, {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              dashboard: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create(USERNAME, {
        password: 'changeme',
        roles: [ROLE],
        full_name: USERNAME,
      });

      await security.login(USERNAME, 'changeme', {
        expectSpaceSelector: true,
      });

      await dashboard.gotoDashboardListingURL({
        args: {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        },
      });
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await security.forceLogout();
      await spaces.delete(customSpace);
      await securityService.user.delete(USERNAME);
      await securityService.role.delete(ROLE);

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/custom_space',
        { space: customSpace }
      );
    });

    it('can favorite and unfavorite a dashboard', async () => {
      await testSubjects.exists('tabbedTableFilter');
      await listingTable.expectItemsCount('dashboard', 1);
      await testSubjects.click('favoriteTab');
      await listingTable.expectItemsCount('dashboard', 0, 1000);
      await testSubjects.click('allTab');
      await listingTable.expectItemsCount('dashboard', 1);
      await testSubjects.moveMouseTo('~dashboardListingTitleLink-A-Dashboard');
      await testSubjects.click('favoriteButton');
      await listingTable.expectItemsCount('dashboard', 1);
      await testSubjects.click('favoriteTab');
      await listingTable.expectItemsCount('dashboard', 1);

      await browser.refresh(); // make sure the favorite state is persisted and filter state is preserved
      await testSubjects.exists('tabbedTableFilter');

      await listingTable.expectItemsCount('dashboard', 1);
      await testSubjects.click('unfavoriteButton');
      await listingTable.expectItemsCount('dashboard', 0, 1000);
      await testSubjects.click('allTab');
      await listingTable.expectItemsCount('dashboard', 1);
    });
  });
}
