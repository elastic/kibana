/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TestSubjects } from '../../../../../test/functional/services/common';
import { FtrProviderContext } from '../ftr_provider_context';
import { TAGFILTER_DROPDOWN_SELECTOR } from './constants';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects([
    'visualize',
    'tagManagement',
    'visEditor',
    'common',
    'header',
  ]);
  const retry = getService('retry');

  /**
   * Select tags in the searchbar's tag filter.
   */
  const selectFilterTags = async (...tagNames: string[]) => {
    // open the filter dropdown
    const filterButton = await find.byCssSelector(TAGFILTER_DROPDOWN_SELECTOR);
    await filterButton.click();
    // select the tags
    for (const tagName of tagNames) {
      await testSubjects.click(
        `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(tagName)}`
      );
    }
    // click elsewhere to close the filter dropdown
    const searchFilter = await find.byCssSelector('.euiPageTemplate .euiFieldSearch');
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

  const newSelectSavedObjectTag = async (tagName: string) => {
    await testSubjects.click('savedObjectTagSelector');
    const testSubjectName = `tagSelectorOption-${PageObjects.tagManagement.testSubjFriendly(
      tagName
    )}`;
    const tagNameOptionExists = await testSubjects.exists(testSubjectName, { timeout: 5000 });
    if (tagNameOptionExists) {
      await testSubjects.click(testSubjectName);
    } else {
      throw new Error('tag not available to select');
    }
    // click the tagSelector option again to close the dropdown
    await testSubjects.click('savedObjectTagSelector');
  };

  const clickSaveVisShowModal = async (waitTime = 2000) => {
    const isOpen = await testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
    if (!isOpen) {
      await testSubjects.click('visualizeSaveButton');
    }
  };

  const newSetSaveModalValues = async () => {
    const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
    const label = await dashboardSelector.findByCssSelector(`label[for="add-to-library-option"]`);
    await label.click();
  };

  const newWaitUntilTableIsLoaded = async () => {
    return retry.waitFor('visualize listing table visible', async () => {
      const isLoaded = await find.existsByDisplayedByCssSelector(
        '[data-test-subj="itemsInMemTable"]:not(.euiBasicTable-loading)'
      );
      if (isLoaded) {
        return true;
      } else {
        throw new Error('Waiting for visualize listing table visible');
      }
    });
  };
  const newGetAllItemsNamesOnCurrentPage = async () => {
    const visNames: string[] = [];
    await retry.try(async () => {
      const links = await find.allByCssSelector('.euiTableRow .euiLink');
      for (let i = 0; i < links.length; i++) {
        visNames.push(await links[i].getVisibleText());
      }
    });
    return visNames;
  };

  const waitNewVisualizationModalIsLoaded = async () => {
    return retry.waitFor('visualize create new visualization modal visible', async () => {
      const isVisible = await find.existsByDisplayedByCssSelector('.euiModal .visNewVisDialog');
      if (isVisible) {
        return true;
      } else {
        throw new Error('Waiting for new visualize modal visible');
      }
    });
  };

  describe('visualize integration', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/visualize/data.json'
      );
      await esArchiver.loadIfNeeded(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/visualize/data.json'
      );
      await kibanaServer.savedObjects.clean({ types: ['tag'] });
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('listing', () => {
      beforeEach(async () => {
        // await PageObjects.visualize.gotoVisualizationLandingPage(); // ok, under the covers uses PageObjects.common.navigateToApp('visualize').
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.header.waitUntilLoadingHasFinished();
        // await listingTable.waitUntilTableIsLoaded(); // should be ok but let's convert this to retryForTime
        await newWaitUntilTableIsLoaded();
      });

      it('OK: allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });
        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.eql(['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']);
      });

      it('OK: allows to filter by selecting a tag in the filter menu', async () => {
        await selectFilterTags('tag-1');
        await listingTable.expectItemsCount('visualize', 2);

        // const itemNames = await listingTable.getAllItemsNames(); // ugly, uses while true that's hard coded
        const itemNamesArray = await newGetAllItemsNamesOnCurrentPage();
        expect(itemNamesArray.length).to.equal(2);
        expect(itemNamesArray).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
        ]);
      });

      it('OK: allows to filter by multiple tags', async () => {
        await selectFilterTags('tag-2', 'tag-3');

        await listingTable.expectItemsCount('visualize', 2);
        // const itemNames = await listingTable.getAllItemsNames(); // ugly, uses while true that's hard coded
        const itemNamesArray = await newGetAllItemsNamesOnCurrentPage();
        expect(itemNamesArray.length).to.equal(2);
        expect(itemNamesArray).to.eql([
          'Visualization 2 (tag-2)',
          'Visualization 3 (tag-1 + tag-3)',
        ]);
      });
    });

    describe.only('creating', () => {
      beforeEach(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.clickNewVisualization();
        await waitNewVisualizationModalIsLoaded();
        // await listingTable.waitUntilTableIsLoaded(); // should be ok but let's convert this to retryForTime
      });
      it('TO TEST: allows to assign tags to the new visualization', async () => {
        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('Just some markdown');
        await PageObjects.visEditor.clickGo();
        // await PageObjects.visualize.ensureSavePanelOpen(); // includes waiting for loading/rendering to complete
        await clickSaveVisShowModal(); // actually save the visualization; Replaces PageObjects.visualize.ensureSavePanelOpen();
        // await await PageObjects.visualize.setSaveModalValues('My new markdown viz'); //replaced by stripped down version below
        await newSetSaveModalValues();

        // await selectSavedObjectTags('tag-1');
        await newSelectSavedObjectTag('tag-1');
        // await PageObjects.visualize.saveVisualization('My new markdown viz'); not needed, replaced

        await testSubjects.click('confirmSaveSavedObjectButton');
        await PageObjects.common.waitForSaveModalToClose();
        // end creating new vis with a tag

        await PageObjects.visualize.gotoVisualizationLandingPage(); // OK to keep
        await listingTable.waitUntilTableIsLoaded(); // OK to keep

        await selectFilterTags('tag-1'); // OK to keep
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('My new markdown viz');
      });

      it.skip('TODO: allows to create a tag from the tag selector', async () => {
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
        // ensure we have the item we want to selecte in the listing table.
        await listingTable.searchAndExpectItemsCount('visualize', 'Visualization 1 (tag-1)', 1);
        // click the visualization
        await listingTable.clickItemLink('visualize', 'Visualization 1 (tag-1)'); // Question: what happens now?

        await PageObjects.visualize.ensureSavePanelOpen();
        await selectSavedObjectTags('tag-2'); // here

        await testSubjects.click('confirmSaveSavedObjectButton');
        await PageObjects.common.waitForSaveModalToClose();
        // debugger;
        // between these two lines is where the visualization isn't being re-saved.
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('tag-2'); // the tag list doesn't include tagnames already selected.
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('Visualization 1 (tag-1)');
      });
    });
  });
}
