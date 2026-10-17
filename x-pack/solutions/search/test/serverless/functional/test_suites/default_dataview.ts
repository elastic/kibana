/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';
import type { RoleCredentials } from '../services';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchNavigation = getService('svlSearchNavigation');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const discover = getPageObject('discover');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;

  describe('default dataView', function () {
    before(async () => {
      await svlCommonPage.loginWithRole('developer');
      await discover.setQueryMode('classic');
      await svlSearchNavigation.navigateToLandingPage();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      // re-create the default data view in case it has been cleaned up by another test
      await dataViewApi.create({
        roleAuthc,
        id: 'default_all_data_id',
        name: 'default:all-data',
        title: '*,-.*',
      });
    });

    it('should show discover but with no data', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await testSubjects.existOrFail('discover-dataView-switch-link');
      // The switcher is disabled while Discover's first search is loading, and a click on a
      // disabled button is silently ignored, so retry until the picker has opened
      await retry.try(async () => {
        if (!(await testSubjects.exists('changeDataViewPopover'))) {
          await testSubjects.click('discover-dataView-switch-link');
        }
        await testSubjects.existOrFail('changeDataViewPopover', { timeout: 5_000 });
      });
      await testSubjects.existOrFail('indexPattern-add-field');
    });

    it('should show dashboard but with no data in dashboard', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });
      await testSubjects.existOrFail('dashboardListingCreateButton');
      await testSubjects.click('dashboardListingCreateButton');
      await testSubjects.existOrFail('emptyDashboardWidget');
    });
  });
}
