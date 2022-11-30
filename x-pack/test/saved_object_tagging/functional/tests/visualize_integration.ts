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
    'tagManagement',
    'visEditor',
    'common',
    'header',
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
  // creates a simple markdown vis with a tag provided.
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
    if (tagName) {
      await selectSavedObjectTags(tagName);
    }

    await testSubjects.click('confirmSaveSavedObjectButton');
    await retry.waitForWithTimeout('Save modal to disappear', 5000, () =>
      testSubjects
        .missingOrFail('confirmSaveSavedObjectButton')
        .then(() => true)
        .catch(() => false)
    );

    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('visualize integration', () => {
    before(async () => {
      // clean up any left-over visualizations and tags from tests that didn't clean up after themselves
      await kibanaServer.savedObjects.clean({ types: ['tag', 'visualization'] });

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
      // clean up after test suite
      await kibanaServer.savedObjects.clean({ types: ['tag', 'visualization'] });
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('listing', () => {
      beforeEach(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
      });

      it('allows to manually type tag filter query', async () => {
        await listingTable.searchForItemWithName('tag:(tag-1)', { escape: false });
        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.eql(['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']);
      });

      it('allows to filter by selecting a tag in the filter menu', async () => {
        await selectFilterTags('tag-1');

        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.eql(['Visualization 1 (tag-1)', 'Visualization 3 (tag-1 + tag-3)']);
      });

      it('allows to filter by multiple tags', async () => {
        await selectFilterTags('tag-2', 'tag-3');

        await listingTable.expectItemsCount('visualize', 2);
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.eql(['Visualization 2 (tag-2)', 'Visualization 3 (tag-1 + tag-3)']);
      });
    });

    describe('creating', () => {
      before(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        // delete all visualizations to create new ones explicitly
        await PageObjects.visualize.deleteAllVisualizations();
      });
      it('allows to assign tags to the new visualization', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await createSimpleMarkdownVis({
          visText: 'Just some markdown',
          visName: 'My new markdown viz',
          tagName: 'myextratag',
        });

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('myextratag');
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.contain('My new markdown viz');
      });

      it('allows to create a tag from the tag selector', async () => {
        const { tagModal } = PageObjects.tagManagement;

        await PageObjects.visualize.navigateToNewVisualization();

        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt('Just some markdown');
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.ensureSavePanelOpen();
        await PageObjects.visualize.setSaveModalValues('vis-with-new-tag', {
          saveAsNew: false,
          redirectToOrigin: true,
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
        await PageObjects.common.waitForSaveModalToClose();

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('my-new-tag');
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.contain('vis-with-new-tag');
      });
    });

    describe('editing', () => {
      before(async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.deleteAllVisualizations();
        // create a vis to add a tag to during edit
        await PageObjects.visualize.navigateToNewVisualization();
        await createSimpleMarkdownVis({
          visText: 'Edit me!',
          visName: 'MarkdownViz',
        });
      });

      it('allows to assign tags to an existing visualization', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();
        await listingTable.clickItemLink('visualize', 'MarkdownViz');
        await PageObjects.visualize.ensureSavePanelOpen();
        await selectSavedObjectTags(...['myextratag']);
        await testSubjects.click('confirmSaveSavedObjectButton');
        await retry.waitForWithTimeout('Save modal to disappear', 5000, () =>
          testSubjects
            .missingOrFail('confirmSaveSavedObjectButton')
            .then(() => true)
            .catch(() => false)
        );

        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.waitUntilTableIsLoaded();

        await selectFilterTags('myextratag');
        const itemNames = await listingTable.getAllSelectableItemsNames();
        expect(itemNames).to.contain('MarkdownViz');
      });
    });
  });
}
