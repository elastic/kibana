/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'visualize',
    'visEditor',
    'timePicker',
    'lens',
  ]);

  const DASHBOARD_NAME = 'Panel Title Test';
  const CUSTOM_TITLE = 'Test Custom Title';
  const EMPTY_TITLE = '[No Title]';
  const LIBRARY_TITLE_FOR_CUSTOM_TESTS = 'Library Title for Custom Title Tests';
  const LIBRARY_TITLE_FOR_EMPTY_TESTS = 'Library Title for Empty Title Tests';

  describe('panel titles', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(DASHBOARD_NAME);
    });

    describe('by value', () => {
      it('new panel by value has empty title', async () => {
        await PageObjects.lens.createAndAddLensFromDashboard({});
        const newPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(newPanelTitle).to.equal(EMPTY_TITLE);
      });

      it('saving new panel with blank title clears "unsaved changes" badge', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('');
        await dashboardCustomizePanel.clickSaveButton();
        await PageObjects.dashboard.clearUnsavedChanges();
      });

      it('custom title causes unsaved changes and saving clears it', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle(CUSTOM_TITLE);
        await dashboardCustomizePanel.clickSaveButton();
        const panelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(panelTitle).to.equal(CUSTOM_TITLE);
        await PageObjects.dashboard.clearUnsavedChanges();
      });

      it('resetting title on a by value panel sets it to the empty string', async () => {
        const BY_VALUE_TITLE = 'Reset Title - By Value';
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle(BY_VALUE_TITLE);
        await dashboardCustomizePanel.clickSaveButton();

        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.resetCustomPanelTitle();
        await dashboardCustomizePanel.clickSaveButton();
        const panelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(panelTitle).to.equal(EMPTY_TITLE);
        await PageObjects.dashboard.clearUnsavedChanges();
      });
    });

    describe('by reference', () => {
      it('linking a by value panel with a custom title to the library will overwrite the custom title with the library title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle(CUSTOM_TITLE);
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacySaveToLibrary(LIBRARY_TITLE_FOR_CUSTOM_TESTS);
        await retry.try(async () => {
          // need to surround in 'retry' due to delays in HTML updates causing the title read to be behind
          const newPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
          expect(newPanelTitle).to.equal(LIBRARY_TITLE_FOR_CUSTOM_TESTS);
        });
      });

      it('resetting title on a by reference panel sets it to the library title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('This should go away');
        await dashboardCustomizePanel.clickSaveButton();

        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.resetCustomPanelTitle();
        await dashboardCustomizePanel.clickSaveButton();
        const resetPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(resetPanelTitle).to.equal(LIBRARY_TITLE_FOR_CUSTOM_TESTS);
      });

      it('unlinking a by reference panel with a custom title will keep the current title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle(CUSTOM_TITLE);
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacyUnlinkFromLibary();
        const newPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(newPanelTitle).to.equal(CUSTOM_TITLE);
      });

      it("linking a by value panel with a blank title to the library will set the panel's title to the library title", async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacySaveToLibrary(LIBRARY_TITLE_FOR_EMPTY_TESTS);
        await retry.try(async () => {
          // need to surround in 'retry' due to delays in HTML updates causing the title read to be behind
          const newPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
          expect(newPanelTitle).to.equal(LIBRARY_TITLE_FOR_EMPTY_TESTS);
        });
      });

      it('unlinking a by reference panel without a custom title will keep the library title', async () => {
        await dashboardPanelActions.legacyUnlinkFromLibary();
        const newPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(newPanelTitle).to.equal(LIBRARY_TITLE_FOR_EMPTY_TESTS);
      });
    });
  });
}
