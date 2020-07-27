/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'lens']);

  describe('empty dashboard', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    async function createAndAddLens(title) {
      log.debug(`createAndAddLens(${title})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await PageObjects.visualize.clickLensWidget();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });
      await PageObjects.lens.save(title, false, true);
    }

    it('adds Lens visualization to empty dashboard', async () => {
      const title = 'Dashboard Test Lens';
      await testSubjects.exists('addVisualizationButton');
      await testSubjects.click('addVisualizationButton');
      await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
      await createAndAddLens(title);
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
  });
}
