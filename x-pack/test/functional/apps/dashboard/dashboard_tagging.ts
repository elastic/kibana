/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const PageObjects = getPageObjects([
    'common',
    'tagManagement',
    'header',
    'dashboard',
    'visualize',
    'lens',
  ]);

  const dashboardTag = 'extremely-cool-dashboard';
  const dashboardTitle = 'Coolest Blank Dashboard';

  describe('dashboard tagging', () => {
    const verifyTagFromListingPage = async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.waitUntilTableIsLoaded();

      // open the filter dropdown
      const filterButton = await find.byCssSelector('.euiFilterGroup .euiFilterButton');
      await filterButton.click();
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(dashboardTag)}`
      );
      // click elsewhere to close the filter dropdown
      const searchFilter = await find.byCssSelector('.euiPageBody .euiFieldSearch');
      await searchFilter.click();
      // wait until the table refreshes
      await listingTable.waitUntilTableIsLoaded();
      const itemNames = await listingTable.getAllItemsNames();
      expect(itemNames).to.contain(dashboardTitle);
    };

    const createTagFromDashboard = async () => {
      await testSubjects.click('dashboardSaveMenuItem');
      await testSubjects.click('savedObjectTagSelector');
      await testSubjects.click(`tagSelectorOption-action__create`);

      expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(true);

      await PageObjects.tagManagement.tagModal.fillForm(
        {
          name: dashboardTag,
          color: '#fc03db',
          description: '',
        },
        {
          submit: true,
        }
      );
      expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(false);
    };

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('adds a new tag to a new Dashboard', async () => {
      await createTagFromDashboard();
      PageObjects.dashboard.saveDashboard(dashboardTitle, {}, false);
      await verifyTagFromListingPage();
    });

    it('retains its saved object tags after quicksave', async () => {
      await PageObjects.dashboard.gotoDashboardEditMode(dashboardTitle);
      await PageObjects.dashboard.useMargins(false); // turn margins off to cause quicksave to be enabled
      await PageObjects.dashboard.clickQuickSave();
      await verifyTagFromListingPage();
    });
  });
}
