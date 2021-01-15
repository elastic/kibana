/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['visualize', 'tagManagement', 'visEditor', 'common']);

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
    const searchFilter = await find.byCssSelector('main .euiFieldSearch');
    await searchFilter.click();
    // wait until the table refreshes
    await listingTable.waitUntilTableIsLoaded();
  };

  const selectSavedObjectTags = async (...tagNames: string[]) => {
    await testSubjects.click('savedObjectTagSelector');
    for (const tagName of tagNames) {
      await testSubjects.click(
        `tagSelectorOption-${PageObjects.tagManagement.testSubjFriendly(tagName)}`
      );
    }
    await testSubjects.click('savedObjectTitle');
  };

  describe('visualize integration', () => {
    before(async () => {
      await esArchiver.load('visualize');
      await esArchiver.loadIfNeeded('logstash_functional');
    });
    after(async () => {
      await esArchiver.unload('visualize');
      await esArchiver.unload('logstash_functional');
    });

    describe('listing', () => {
      beforeEach(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });
        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await selectFilterTags('tag-1');

        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']);
      });

      it('allows to filter by multiple tags', async () => {
        await selectFilterTags('tag-2', 'tag-3');

        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['Visualization 2 (tag-2)', 'Visualization 3 (tag-1 + tag-3)']);
      });
    });

    describe('creating', () => {
      it('allows to assign tags to the new visualization', async () => {
        await PageObjects.visualize.navigateToNewVisualization();

        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('Just some markdown');
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.ensureSavePanelOpen();
        await PageObjects.visualize.setSaveModalValues('My new markdown viz');

        await selectSavedObjectTags('tag-1');

        await testSubjects.click('confirmSaveSavedObjectButton');
        await PageObjects.common.waitForSaveModalToClose();

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('tag-1');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('My new markdown viz');
      });

      it('allows to create a tag from the tag selector', async () => {
        const { tagModal } = PageObjects.tagManagement;

        await PageObjects.visualize.navigateToNewVisualization();

        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('Just some markdown');
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.ensureSavePanelOpen();
        await PageObjects.visualize.setSaveModalValues('vis-with-new-tag');

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
        await PageObjects.common.waitForSaveModalToClose();

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('my-new-tag');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('vis-with-new-tag');
      });
    });

    describe('editing', () => {
      beforeEach(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to assign tags to an existing visualization', async () => {
        await listingTable.clickItemLink('visualize', 'Visualization 1 (tag-1)');

        await PageObjects.visualize.ensureSavePanelOpen();
        await selectSavedObjectTags('tag-2');

        await testSubjects.click('confirmSaveSavedObjectButton');
        await PageObjects.common.waitForSaveModalToClose();

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('tag-2');
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('Visualization 1 (tag-1)');
      });
    });
  });
}
