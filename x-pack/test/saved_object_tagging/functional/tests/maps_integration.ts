/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['maps', 'common', 'tagManagement', 'visualize']);

  describe('maps integration', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/maps/data.json'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/maps/data.json'
      );
      await kibanaServer.savedObjects.clean({ types: ['tag'] });
    });

    describe('listing', () => {
      beforeEach(async () => {
        // force refresh of maps listing page between tests
        await PageObjects.common.navigateToUrlWithBrowserHistory('maps', '/');
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });

        await listingTable.expectItemsCount('map', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['map 3 (tag-1 and tag-3)', 'map 4 (tag-1)']);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await listingTable.selectFilterTags('tag-3');

        await listingTable.expectItemsCount('map', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['map 3 (tag-1 and tag-3)', 'map 2 (tag-3)']);
      });

      it('allows to filter by multiple tags', async () => {
        await listingTable.selectFilterTags('tag-2', 'tag-3');

        await listingTable.expectItemsCount('map', 3);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['map 3 (tag-1 and tag-3)', 'map 1 (tag-2)', 'map 2 (tag-3)']);
      });
    });

    describe('creating', () => {
      beforeEach(async () => {
        await PageObjects.maps.openNewMap();
      });

      it('allows to select tags for a new map', async () => {
        await PageObjects.maps.saveMap('my-new-map', true, true, ['tag-1', 'tag-3']);

        await PageObjects.maps.gotoMapListingPage();
        await listingTable.waitUntilTableIsLoaded();
        await listingTable.selectFilterTags('tag-1');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('my-new-map');
      });

      it('allows to create a tag from the tag selector', async () => {
        const { tagModal } = PageObjects.tagManagement;

        await testSubjects.click('mapSaveButton');
        await testSubjects.setValue('savedObjectTitle', 'map-with-new-tag');
        await PageObjects.visualize.setSaveModalValues('map-with-new-tag', {
          addToDashboard: false,
          saveAsNew: true,
        });

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
            clearWithKeyboard: true,
          }
        );

        expect(await tagModal.isOpened()).to.be(false);

        await testSubjects.click('confirmSaveSavedObjectButton');

        await PageObjects.maps.gotoMapListingPage();
        await listingTable.waitUntilTableIsLoaded();
        await listingTable.selectFilterTags('my-new-tag');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('map-with-new-tag');
      });
    });

    describe('editing', () => {
      beforeEach(async () => {
        // force refresh of maps listing page between tests
        await PageObjects.common.navigateToUrlWithBrowserHistory('maps', '/');
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to select tags for an existing map', async () => {
        await listingTable.clickItemLink('map', 'map 4 (tag-1)');

        await PageObjects.maps.saveMap('map 4 (tag-1)', true, false, ['tag-3']);

        await PageObjects.maps.gotoMapListingPage();
        await listingTable.waitUntilTableIsLoaded();
        await listingTable.selectFilterTags('tag-3');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('map 4 (tag-1)');
      });
    });
  });
}
