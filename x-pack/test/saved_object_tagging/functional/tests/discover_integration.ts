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
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'tagManagement',
    'common',
    'header',
    'timePicker',
    'discover',
  ]);
  const retry = getService('retry');

  /**
   * Select tags in the searchbar's tag filter.
   */
  const selectFilterTags = async (...tagNames: string[]) => {
    // open the filter dropdown
    const filterButton = await testSubjects
      .find('loadSearchForm')
      .then((wrapper) => wrapper.findByCssSelector('.euiFilterGroup .euiFilterButton'));
    await filterButton.click();
    // select the tags
    for (const tagName of tagNames) {
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(tagName)}`
      );
    }
    // click elsewhere to close the filter dropdown
    const searchFilter = await testSubjects.find('savedObjectFinderSearchInput');
    await searchFilter.click();
  };

  const expectSavedSearches = async (...savedSearchTitles: string[]) => {
    await testSubjects.retry.try(async () => {
      const searchTitleWrappers = await testSubjects.findAll('savedObjectFinderTitle');
      const searchTitles = await Promise.all(
        searchTitleWrappers.map((entry) => entry.getVisibleText())
      );
      searchTitles.sort();
      savedSearchTitles.sort();
      expect(searchTitles).to.eql(savedSearchTitles);
    });
  };

  describe('discover integration', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/discover/data.json'
      );
      await esArchiver.loadIfNeeded(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/discover/data.json'
      );
      await kibanaServer.savedObjects.clean({ types: ['tag'] });
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('open search', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('allows to manually type tag filter query', async () => {
        await PageObjects.discover.openLoadSavedSearchPanel();
        await testSubjects.setValue('savedObjectFinderSearchInput', 'tag:(tag-1)');
        await expectSavedSearches('A Saved Search\nA Saved Search Description');
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await PageObjects.discover.openLoadSavedSearchPanel();
        await selectFilterTags('tag-2');
        await expectSavedSearches(
          'A Saved Search\nA Saved Search Description',
          'A Different Saved Search\nA Different Saved Search Description'
        );
      });

      it('allows to filter by multiple tags', async () => {
        await PageObjects.discover.openLoadSavedSearchPanel();
        await selectFilterTags('tag-2', 'tag-3');
        await expectSavedSearches(
          'A Different Saved Search\nA Different Saved Search Description',
          'A Saved Search\nA Saved Search Description',
          'A Third Saved Search\nAn Untagged Saved Search Description'
        );
      });
    });

    describe('creating', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('logstash-*');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('allows to select tags for a new saved search', async () => {
        await PageObjects.discover.saveSearch('My New Search', undefined, {
          tags: ['tag-1', 'tag-2'],
        });
        await PageObjects.discover.openLoadSavedSearchPanel();
        await selectFilterTags('tag-1', 'tag-2');
        await expectSavedSearches(
          'A Different Saved Search\nA Different Saved Search Description',
          'A Saved Search\nA Saved Search Description',
          'My New Search'
        );
      });

      it('allows to create a tag from the tag selector', async () => {
        await PageObjects.discover.clickSaveSearchButton();
        const searchName = 'search-with-new-tag';
        // preventing an occasional flakiness when the saved object wasn't set and the form can't be submitted
        await retry.waitFor(
          `saved search title is set to ${searchName} and save button is clickable`,
          async () => {
            const saveButton = await testSubjects.find('confirmSaveSavedObjectButton');
            await testSubjects.setValue('savedObjectTitle', searchName);
            return (await saveButton.getAttribute('disabled')) !== 'true';
          }
        );
        await testSubjects.setValue('savedObjectTitle', 'search-with-new-tag');
        await testSubjects.click('savedObjectTagSelector');
        await testSubjects.click(`tagSelectorOption-action__create`);
        const { tagModal } = PageObjects.tagManagement;
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
        await PageObjects.common.waitForSaveModalToClose();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.openLoadSavedSearchPanel();
        await selectFilterTags('my-new-tag');
        await expectSavedSearches('search-with-new-tag');
      });
    });

    describe('editing', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('allows to select tags for an existing saved search', async () => {
        await PageObjects.discover.loadSavedSearch('A Saved Search');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.saveSearch('A Saved Search', undefined, {
          tags: ['tag-3'],
        });
        await PageObjects.discover.openLoadSavedSearchPanel();
        await selectFilterTags('tag-3');
        await expectSavedSearches(
          'A Different Saved Search\nA Different Saved Search Description',
          'A Saved Search\nA Saved Search Description',
          'A Third Saved Search\nAn Untagged Saved Search Description'
        );
      });
    });
  });
}
