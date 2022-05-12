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
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['maps', 'tagManagement', 'common', 'visualize']);

  /**
   * Select tags in the searchbar's tag filter.
   */
  const selectFilterTags = async (...tagNames: string[]) => {
    // open the filter dropdown
    const filterButton = await find.byCssSelector('.euiFilterGroup .euiFilterButton');
    await filterButton.click();
    // select the tags
    for (const tagName of tagNames) {
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(tagName)}`
      );
    }
    // click elsewhere to close the filter dropdown
    const searchFilter = await find.byCssSelector('.euiPageBody .euiFieldSearch');
    await searchFilter.click();
  };

  // Failing: See https://github.com/elastic/kibana/issues/89073
  describe.skip('maps integration', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/saved_object_tagging/common/fixtures/es_archiver/maps');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/saved_object_tagging/common/fixtures/es_archiver/maps');
    });

    describe('listing', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrlWithBrowserHistory('maps', '/');
        await PageObjects.maps.gotoMapListingPage();
      });

      it('allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });

        await listingTable.expectItemsCount('map', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['map 3 (tag-1 and tag-3)', 'map 4 (tag-1)']);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await selectFilterTags('tag-3');

        await listingTable.expectItemsCount('map', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['map 3 (tag-1 and tag-3)', 'map 2 (tag-3)']);
      });

      it('allows to filter by multiple tags', async () => {
        await selectFilterTags('tag-2', 'tag-3');

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
        await selectFilterTags('tag-1');
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
          }
        );

        expect(await tagModal.isOpened()).to.be(false);

        await testSubjects.click('confirmSaveSavedObjectButton');

        await PageObjects.maps.gotoMapListingPage();
        await selectFilterTags('my-new-tag');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('map-with-new-tag');
      });
    });

    describe('editing', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrlWithBrowserHistory('maps', '/');
      });

      it('allows to select tags for an existing map', async () => {
        await listingTable.clickItemLink('map', 'map 4 (tag-1)');

        await PageObjects.maps.saveMap('map 4 (tag-1)', true, true, ['tag-3']);

        await PageObjects.maps.gotoMapListingPage();
        await selectFilterTags('tag-3');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('map 4 (tag-1)');
      });
    });
  });
}
