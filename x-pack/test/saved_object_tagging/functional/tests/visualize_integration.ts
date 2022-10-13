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
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'visualize',
    'header',
    'tagManagement',
    'visEditor',
    'common',
  ]);

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
  // note: I need to refactor to allow for multiple tags
  const createSimpleMarkdownVis = async (opts: Record<string, string>) => {
    const { visName, visText, tagName } = opts;
    await PageObjects.visualize.navigateToNewVisualization();

    await PageObjects.visualize.clickMarkdownWidget();
    await PageObjects.visEditor.setMarkdownTxt(visText);
    await PageObjects.visEditor.clickGo();

    await PageObjects.visualize.ensureSavePanelOpen();
    await PageObjects.visualize.setSaveModalValues(visName, {
      saveAsNew: false,
      redirectToOrigin: true,
    });

    await selectSavedObjectTags(tagName);

    await testSubjects.click('confirmSaveSavedObjectButton');
    await retry.waitForWithTimeout('Save modal to disappear', 5000, () =>
      testSubjects
        .missingOrFail('confirmSaveSavedObjectButton')
        .then(() => true)
        .catch(() => false)
    );

    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  // Failing: See https://github.com/elastic/kibana/issues/89958
  describe('visualize integration', () => {
    before(async () => {
      await kibanaServer.savedObjects.clean({ types: ['visualization'] });
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

      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('listing', () => {
      before(async function () {
        // delete all loaded visualizations (in case create ran first)
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.deleteAllVisualizations();
        // create two visualizations with tags
        let selectedTagName = 'tag-1';
        let newVisName = 'Visualization 1';
        await createSimpleMarkdownVis({
          visName: newVisName,
          visText: 'Just some markdown 1',
          tagName: selectedTagName,
        });
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
        selectedTagName = 'tag-2';
        newVisName = 'Visualization 2';
        await createSimpleMarkdownVis({
          visName: newVisName,
          visText: 'Just some markdown 2',
          tagName: selectedTagName,
        });
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
        selectedTagName = 'tag-1';
        newVisName = 'Visualization 3';
        await createSimpleMarkdownVis({
          visName: newVisName,
          visText: 'Just some markdown 3',
          tagName: selectedTagName,
        });
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to manually type tag filter query', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });
        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('Visualization 1');
        expect(itemNames).to.contain('Visualization 3');
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await selectFilterTags('tag-1');

        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('Visualization 1');
        expect(itemNames).to.contain('Visualization 3');
      });

      it('allows to filter by multiple tags', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await selectFilterTags('tag-2', 'tag-1');

        await listingTable.expectItemsCount('visualize', 3);
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain('Visualization 2');
        expect(itemNames).to.contain('Visualization 1');
        expect(itemNames).to.contain('Visualization 3');
      });
    });

    describe('creating', () => {
      before(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.deleteAllVisualizations();
      });
      after(async () => {
        await PageObjects.visualize.deleteAllVisualizations();
      });

      it('allows to assign tags to the new visualization', async () => {
        const selectedTagName = 'tag-1';
        const newVisName = 'My new markdown viz';
        await createSimpleMarkdownVis({
          visName: newVisName,
          visText: 'Just some markdown',
          tagName: selectedTagName,
        });
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        // open the filter dropdown
        const filterButton = await find.byCssSelector(
          '.euiFilterGroup .euiPopover:nth-child(2) .euiFilterButton'
        );
        await filterButton.click();
        await testSubjects.click(
          `tag-searchbar-option-${PageObjects.tagManagement.testSubjFriendly(selectedTagName)}`
        );
        // click elsewhere to close the filter dropdown
        const searchFilter = await find.byCssSelector('.euiPageTemplate .euiFieldSearch');
        await searchFilter.click();
        // wait until the table refreshes
        await listingTable.waitUntilTableIsLoaded();
        const itemNames = await listingTable.getAllItemsNames();
        expect(itemNames).to.contain(newVisName);
      });

      it('allows to create a tag from the tag selector', async () => {
        const newTagName = 'my-new-tag';
        const newVisName = 'vis-with-new-tag';
        await PageObjects.visualize.navigateToNewVisualization();

        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('Just some markdown');
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.ensureSavePanelOpen();
        await PageObjects.visualize.setSaveModalValues(newVisName, {
          saveAsNew: false,
          redirectToOrigin: true,
        });

        await testSubjects.click('savedObjectTagSelector');
        await testSubjects.click(`tagSelectorOption-action__create`);

        expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(true);

        await PageObjects.tagManagement.tagModal.fillForm(
          {
            name: 'my-new-tag',
            color: '#FFCC33',
            description: '',
          },
          {
            submit: true,
          }
        );

        expect(await PageObjects.tagManagement.tagModal.isOpened()).to.be(false);
        await testSubjects.click('confirmSaveSavedObjectButton');
        await retry.waitForWithTimeout('Save modal to disappear', 5000, () =>
          testSubjects
            .missingOrFail('confirmSaveSavedObjectButton')
            .then(() => true)
            .catch(() => false)
        );
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags(newTagName);
        const itemNames = await listingTable.getAllItemsNamesSkipPagination();
        expect(itemNames).to.contain(newVisName);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/88639
    describe.skip('editing', () => {
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
