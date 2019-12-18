/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getPageObjects, getService }) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'lens']);

  describe('empty dashboard', function() {
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
        dimension:
          '[data-test-subj="lnsXY_xDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_yDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension:
          '[data-test-subj="lnsXY_splitDimensionPanel"] [data-test-subj="indexPattern-configure-dimension"]',
        operation: 'terms',
        field: 'ip',
      });
      await PageObjects.lens.save(title);
    }

    it.skip('adds Lens visualization to empty dashboard', async () => {
      const title = 'Dashboard Test Lens';
      await testSubjects.exists('addVisualizationButton');
      await testSubjects.click('addVisualizationButton');
      await createAndAddLens(title);
      await PageObjects.dashboard.waitForRenderComplete();
      await testSubjects.exists(`embeddablePanelHeading-${title}`);
    });
  });
}
