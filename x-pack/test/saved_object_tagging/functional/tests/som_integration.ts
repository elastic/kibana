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
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['settings', 'tagManagement', 'savedObjects', 'common']);

  /**
   * Select tags in the searchbar's tag filter.
   * EUI does not allow to specify a testSubj for filters...
   */
  const selectTagsInFilter = async (...tagNames: string[]) => {
    // open the filter dropdown
    // This CSS selector should be cleaned up once we have testSubjects in EUI filters.
    const filterButton = await find.byCssSelector(
      '.euiFilterGroup > *:last-child .euiFilterButton'
    );
    await filterButton.click();
    // select the tags
    for (const tagName of tagNames) {
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(tagName)}`
      );
    }
    // click elsewhere to close the filter dropdown
    await testSubjects.click('savedObjectSearchBar');
  };

  // FLAKY: https://github.com/elastic/kibana/issues/115320
  describe.skip('saved objects management integration', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/so_management'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/so_management'
      );
    });

    describe('navigating from the tag section', () => {
      beforeEach(async () => {
        await PageObjects.tagManagement.navigateTo();
      });

      it('access the saved objects management section with pre-applied filter', async () => {
        await PageObjects.tagManagement.clickOnConnectionsLink('tag-1');

        await PageObjects.common.waitUntilUrlIncludes('/app/management/kibana/objects');
        await PageObjects.savedObjects.waitTableIsLoaded();

        expect(await PageObjects.savedObjects.getCurrentSearchValue()).to.eql('tag:("tag-1")');
        expect(await PageObjects.savedObjects.getRowTitles()).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
        ]);
      });
    });

    describe('saved object management listing', () => {
      beforeEach(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
      });

      it('allows to manually type tag filter query', async () => {
        await PageObjects.savedObjects.searchForObject('tag:(tag-2)');

        expect(await PageObjects.savedObjects.getRowTitles()).to.eql([
          'Visualization 2 (tag-2)',
          'Visualization 4 (tag-2)',
        ]);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await selectTagsInFilter('tag-1');

        expect(await PageObjects.savedObjects.getRowTitles()).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
        ]);
      });

      it('allows to filter by multiple tags', async () => {
        await selectTagsInFilter('tag-2', 'tag-3');

        expect(await PageObjects.savedObjects.getRowTitles()).to.eql([
          'Visualization 2 (tag-2)',
          'Visualization 3 (tag-1 + tag-3)',
          'Visualization 4 (tag-2)',
        ]);
      });

      it('properly display tags', async () => {
        const testRow = await testSubjects.find('savedObjectsTableRow row-vis-area-3');
        const tagCell = await testSubjects.findDescendant('listingTableRowTags', testRow);
        const tagContents = await tagCell.findAllByCssSelector('.euiBadge__content');
        const tagNames = await Promise.all(tagContents.map((tag) => tag.getVisibleText()));

        expect(tagNames).to.eql(['tag-1', 'tag-3']);
      });
    });
  });
}
