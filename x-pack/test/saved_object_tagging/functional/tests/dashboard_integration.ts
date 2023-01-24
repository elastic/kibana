/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { TAGFILTER_DROPDOWN_SELECTOR } from './constants';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['dashboard', 'tagManagement', 'common']);

  describe('dashboard integration', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/dashboard/data.json'
      );
      await esArchiver.loadIfNeeded(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/dashboard/data.json'
      );
      await kibanaServer.savedObjects.clean({ types: ['tag'] });
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('listing', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });

        await listingTable.expectItemsCount('dashboard', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames.sort()).to.eql([
          'dashboard 3 (tag-1 and tag-3)',
          'dashboard 4 with real data (tag-1)',
        ]);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await listingTable.selectFilterTags('tag-3');

        await listingTable.expectItemsCount('dashboard', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames.sort()).to.eql(['dashboard 2 (tag-3)', 'dashboard 3 (tag-1 and tag-3)']);
      });

      it('allows to filter by multiple tags', async () => {
        await listingTable.selectFilterTags('tag-2', 'tag-3');

        await listingTable.expectItemsCount('dashboard', 3);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames.sort()).to.eql([
          'dashboard 1 (tag-2)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });
    });

    describe('creating', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('allows to select tags for a new dashboard', async () => {
        await PageObjects.dashboard.clickNewDashboard();

        await PageObjects.dashboard.saveDashboard('my-new-dashboard', {
          waitDialogIsClosed: true,
          tags: ['tag-1', 'tag-3'],
        });

        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await listingTable.selectFilterTags('tag-1');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('my-new-dashboard');
      });

      it('allows to create a tag from the tag selector', async () => {
        const { tagModal } = PageObjects.tagManagement;

        await PageObjects.dashboard.clickNewDashboard();

        await testSubjects.click('dashboardSaveMenuItem');
        await testSubjects.setValue('savedObjectTitle', 'dashboard-with-new-tag');

        await testSubjects.click('savedObjectTagSelector');
        await testSubjects.click(`tagSelectorOption-action__create`);

        expect(await tagModal.isOpened()).to.be(true);

        await tagModal.fillForm(
          {
            name: 'my-new-tag',
            color: '#FFCC33',
            description: '',
          },
          {
            submit: true,
          }
        );

        expect(await tagModal.isOpened()).to.be(false);

        await PageObjects.dashboard.clickSave();
        await PageObjects.common.waitForSaveModalToClose();

        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await listingTable.selectFilterTags('my-new-tag');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('dashboard-with-new-tag');
      });
    });

    describe('editing', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to select tags for an existing dashboard', async () => {
        await listingTable.clickItemLink('dashboard', 'dashboard 4 with real data (tag-1)');

        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.dashboard.saveDashboard('dashboard 4 with real data (tag-1)', {
          waitDialogIsClosed: true,
          tags: ['tag-3'],
        });

        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await listingTable.selectFilterTags('tag-3');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('dashboard 4 with real data (tag-1)');
      });
    });
  });
}
