/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'lens']);

  // FLAKY: https://github.com/elastic/kibana/issues/102366
  describe.skip('empty dashboard', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/lens/basic');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('adds Lens visualization to empty dashboard', async () => {
      const title = 'Dashboard Test Lens';
      await PageObjects.lens.createAndAddLensFromDashboard({ title, redirectToOrigin: true });
      await PageObjects.dashboard.waitForRenderComplete();
      await testSubjects.exists(`embeddablePanelHeading-${title}`);
    });

    it('redirects via save and return button after edit', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.saveAndReturn();
    });

    it('redirects via save as button after edit, renaming itself', async () => {
      const newTitle = 'wowee, looks like I have a new title';
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.save(newTitle, false, true);
      await PageObjects.dashboard.waitForRenderComplete();
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount);
      const titles = await PageObjects.dashboard.getPanelTitles();
      expect(titles.indexOf(newTitle)).to.not.be(-1);
    });

    it('redirects via save as button after edit, adding a new panel', async () => {
      const newTitle = 'wowee, my title just got cooler';
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.save(newTitle, true, true);
      await PageObjects.dashboard.waitForRenderComplete();
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount + 1);
      const titles = await PageObjects.dashboard.getPanelTitles();
      expect(titles.indexOf(newTitle)).to.not.be(-1);
    });

    it('loses originatingApp connection after save as when redirectToOrigin is false', async () => {
      await PageObjects.dashboard.saveDashboard('empty dashboard test');
      await PageObjects.dashboard.switchToEditMode();
      const newTitle = 'wowee, my title just got cooler again';
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.save(newTitle, true, false);
      await PageObjects.lens.notLinkedToOriginatingApp();
      await PageObjects.common.navigateToApp('dashboard');
    });

    it('loses originatingApp connection after first save when redirectToOrigin is false', async () => {
      const title = 'non-dashboard Test Lens';
      await PageObjects.dashboard.loadSavedDashboard('empty dashboard test');
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.lens.createAndAddLensFromDashboard({ title });
      await PageObjects.lens.notLinkedToOriginatingApp();
      await PageObjects.common.navigateToApp('dashboard');
    });
  });
}
