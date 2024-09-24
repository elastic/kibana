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
  const testSubjects = getService('testSubjects');
  const { dashboard, lens } = getPageObjects(['dashboard', 'lens']);

  const EMPTY_TITLE = '[No Title]';

  describe('panel titles', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard('Panel Title Test');
      await lens.createAndAddLensFromDashboard({});
    });

    beforeEach(async () => {
      // close any open flyouts to prevent dirty state between tests
      if (await testSubjects.exists('euiFlyoutCloseButton')) {
        await testSubjects.click('euiFlyoutCloseButton');
      }
    });

    describe('by value', () => {
      it('new panel by value has empty title', async () => {
        const [newPanelTitle] = await dashboard.getPanelTitles();
        expect(newPanelTitle).to.equal(EMPTY_TITLE);
      });

      it('saving new panel with blank title clears "unsaved changes" badge', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboard.clearUnsavedChanges();
      });

      it('custom title causes unsaved changes and saving clears it', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('Custom title');
        await dashboardCustomizePanel.clickSaveButton();
        const [panelTitle] = await dashboard.getPanelTitles();
        expect(panelTitle).to.equal('Custom title');
        await dashboard.clearUnsavedChanges();
      });

      it('reset title should be hidden on a by value panel', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('Some title');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.customizePanel();
        expect(await testSubjects.exists('resetCustomEmbeddablePanelTitleButton')).to.be(false);
      });

      it('reset description should be hidden on a by value panel', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelDescription('Some description');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.customizePanel();
        expect(await testSubjects.exists('resetCustomEmbeddablePanelDescriptionButton')).to.be(
          false
        );
      });
    });

    describe('by reference', () => {
      const VIS_LIBRARY_DESCRIPTION = 'Vis library description';

      let count = 0;
      const getVisTitle = (increment = false) =>
        `Vis Library Title - ${increment ? ++count : count}`;

      it('linking a by value panel with a custom title to the library will overwrite the custom title with the library title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('Custom title');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacySaveToLibrary(getVisTitle(true));
        await retry.tryForTime(500, async () => {
          // need to surround in 'retry' due to delays in HTML updates causing the title read to be behind
          const [newPanelTitle] = await dashboard.getPanelTitles();
          expect(newPanelTitle).to.equal(getVisTitle());
        });
      });

      it('resetting title on a by reference panel sets it to the library title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('Custom Title');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.resetCustomPanelTitle();
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.customizePanel();
        expect(await dashboardCustomizePanel.getCustomPanelTitle()).to.equal(getVisTitle());
      });

      it('resetting description on a by reference panel sets it to the library title', async () => {
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.navigateToEditorFromFlyout();
        // legacySaveToLibrary UI cannot set description
        await lens.save(
          getVisTitle(true),
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          VIS_LIBRARY_DESCRIPTION
        );

        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelDescription('Custom description');
        await dashboardCustomizePanel.clickSaveButton();

        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.resetCustomPanelDescription();
        await dashboardCustomizePanel.clickSaveButton();

        await dashboardPanelActions.customizePanel();
        expect(await dashboardCustomizePanel.getCustomPanelDescription()).to.equal(
          VIS_LIBRARY_DESCRIPTION
        );
      });

      it('unlinking a by reference panel with a custom title will keep the current title', async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('Custom title');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacyUnlinkFromLibrary('Custom title');
        const [newPanelTitle] = await dashboard.getPanelTitles();
        expect(newPanelTitle).to.equal('Custom title');
      });

      it("linking a by value panel with a blank title to the library will set the panel's title to the library title", async () => {
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.setCustomPanelTitle('');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboardPanelActions.legacySaveToLibrary(getVisTitle(true));
        await retry.tryForTime(500, async () => {
          // need to surround in 'retry' due to delays in HTML updates causing the title read to be behind
          const [newPanelTitle] = await dashboard.getPanelTitles();
          expect(newPanelTitle).to.equal(getVisTitle());
        });
      });

      it('unlinking a by reference panel without a custom title will keep the library title', async () => {
        await dashboardPanelActions.legacyUnlinkFromLibrary(getVisTitle());
        const [newPanelTitle] = await dashboard.getPanelTitles();
        expect(newPanelTitle).to.equal(getVisTitle());
      });
    });
  });
}
