/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'dashboard',
    'visualize',
    'lens',
    'timeToVisualize',
    'common',
    'header',
  ]);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  const createNewLens = async () => {
    await PageObjects.visualize.navigateToNewVisualization();
    await PageObjects.visualize.clickVisType('lens');
    await PageObjects.lens.goToTimeRange();

    await PageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await PageObjects.lens.switchToVisualization('lnsMetric');

    await PageObjects.lens.waitForVisualization('mtrVis');
    await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
  };

  const createAndSaveDashboard = async (dashboardName: string) => {
    await PageObjects.common.navigateToApp('dashboard');
    await PageObjects.dashboard.clickNewDashboard();
    await dashboardAddPanel.clickOpenAddPanel();
    await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
    await find.clickByButtonText('lnsXYvis');
    await dashboardAddPanel.closeAddPanel();
    await PageObjects.lens.goToTimeRange();

    await PageObjects.dashboard.saveDashboard(dashboardName);
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
  };

  const loadExistingLens = async () => {
    await PageObjects.visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
    await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
    await PageObjects.lens.goToTimeRange();
    await PageObjects.lens.waitForVisualization('mtrVis');
    await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
  };

  describe('lens add-to-dashboards tests', () => {
    it('should allow new lens to be added by value to a new dashboard', async () => {
      await createNewLens();
      await PageObjects.lens.save('New Lens from Modal', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'New Lens from Modal'
      );
      expect(isLinked).to.be(false);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow existing lens be added by value to a new dashboard', async () => {
      await loadExistingLens();
      await PageObjects.lens.save('Artistpreviouslyknownaslens Copy', true, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Artistpreviouslyknownaslens Copy'
      );
      expect(isLinked).to.be(false);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow new lens be added by value to an existing dashboard', async () => {
      await createAndSaveDashboard('My Very Cool Dashboard');
      await createNewLens();

      await PageObjects.lens.save(
        'New Lens from Modal',
        false,
        false,
        false,
        'existing',
        'My Very Cool Dashboard'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'New Lens from Modal'
      );
      expect(isLinked).to.be(false);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow existing lens be added by value to an existing dashboard', async () => {
      await createAndSaveDashboard('My Wonderful Dashboard');
      await loadExistingLens();

      await PageObjects.lens.save(
        'Artistpreviouslyknownaslens Copy',
        true,
        false,
        false,
        'existing',
        'My Wonderful Dashboard'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Artistpreviouslyknownaslens Copy'
      );
      expect(isLinked).to.be(false);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow new lens to be added by reference to a new dashboard', async () => {
      await createNewLens();
      await PageObjects.lens.save('New by ref Lens from Modal', false, false, true, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'New by ref Lens from Modal'
      );
      expect(isLinked).to.be(true);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow existing lens be added by reference to a new dashboard', async () => {
      await loadExistingLens();
      await PageObjects.lens.save('Artistpreviouslyknownaslens by ref', true, false, true, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Artistpreviouslyknownaslens by ref'
      );
      expect(isLinked).to.be(true);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow new lens be added by reference to an existing dashboard', async () => {
      await createAndSaveDashboard('My Very Cool Dashboard 2');
      await createNewLens();

      await PageObjects.lens.save(
        'New Lens by ref from Modal',
        false,
        false,
        true,
        'existing',
        'My Very Cool Dashboard 2'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'New Lens by ref from Modal'
      );
      expect(isLinked).to.be(true);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow existing lens be added by reference to an existing dashboard', async () => {
      await createAndSaveDashboard('My Wonderful Dashboard 2');
      await loadExistingLens();

      await PageObjects.lens.save(
        'Artistpreviouslyknownaslens by ref 2',
        true,
        false,
        true,
        'existing',
        'My Wonderful Dashboard 2'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Artistpreviouslyknownaslens by ref 2'
      );
      expect(isLinked).to.be(true);

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    // issue #111104
    it('should add a Lens heatmap to the dashboard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.waitForVisualization();

      await PageObjects.lens.switchToVisualization('heatmap', 'heat');

      await PageObjects.lens.waitForVisualization();
      await PageObjects.lens.openDimensionEditor('lnsHeatmap_cellPanel > lns-dimensionTrigger');
      await PageObjects.lens.openPalettePanel('lnsHeatmap');
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.save('New Lens Heatmap', false, false, true, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    describe('Capabilities', function capabilitiesTests() {
      describe('dashboard no-access privileges', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('visualize');
          await security.testUser.setRoles(['test_logstash_reader', 'global_visualize_all']);
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not display dashboard flow prompt', async () => {
          await PageObjects.common.navigateToApp('visualize');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should not display add-to-dashboard options', async () => {
          await PageObjects.visualize.navigateToNewVisualization();
          await PageObjects.visualize.clickVisType('lens');
          await PageObjects.lens.goToTimeRange();

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await PageObjects.lens.switchToVisualization('lnsMetric');

          await PageObjects.lens.waitForVisualization('mtrVis');
          await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

          await PageObjects.lens.waitForVisualization('mtrVis');
          await testSubjects.click('lnsApp_saveButton');

          const hasOptions = await testSubjects.exists('add-to-dashboard-options');
          expect(hasOptions).to.eql(false);
        });
      });

      describe('dashboard read-only privileges', () => {
        before(async () => {
          await security.testUser.setRoles([
            'test_logstash_reader',
            'global_visualize_all',
            'global_dashboard_read',
          ]);
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not display dashboard flow prompt', async () => {
          await PageObjects.common.navigateToApp('visualize');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should not display add-to-dashboard options', async () => {
          await PageObjects.visualize.navigateToNewVisualization();
          await PageObjects.visualize.clickVisType('lens');
          await PageObjects.lens.goToTimeRange();

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await PageObjects.lens.switchToVisualization('lnsMetric');

          await PageObjects.lens.waitForVisualization('mtrVis');
          await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

          await PageObjects.lens.waitForVisualization('mtrVis');
          await testSubjects.click('lnsApp_saveButton');

          const hasOptions = await testSubjects.exists('add-to-dashboard-options');
          expect(hasOptions).to.eql(false);
        });
      });
    });
  });
}
