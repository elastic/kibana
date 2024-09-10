/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, visualize, lens, timeToVisualize, common, header } = getPageObjects([
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
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  const createNewLens = async () => {
    await visualize.navigateToNewVisualization();
    await visualize.clickVisType('lens');
    await lens.goToTimeRange();

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await lens.switchToVisualization('lnsLegacyMetric');

    await lens.waitForVisualization('legacyMtrVis');
    await lens.assertLegacyMetric('Average of bytes', '5,727.322');
  };

  const createAndSaveDashboard = async (dashboardName: string) => {
    await dashboard.navigateToApp();
    await dashboard.clickNewDashboard();
    await dashboardAddPanel.clickOpenAddPanel();
    await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
    await find.clickByButtonText('lnsXYvis');
    await dashboardAddPanel.closeAddPanel();
    await lens.goToTimeRange();

    await dashboard.saveDashboard(dashboardName);
    await dashboard.gotoDashboardLandingPage();
    await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
  };

  const loadExistingLens = async () => {
    await visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
    await lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
    await lens.goToTimeRange();
    await lens.waitForVisualization('legacyMtrVis');
    await lens.assertLegacyMetric('Maximum of bytes', '19,986');
  };

  describe('lens add-to-dashboards tests', () => {
    it('should allow new lens to be added by value to a new dashboard', async () => {
      await createNewLens();
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Average of bytes', '5,727.322');
      await dashboardPanelActions.expectNotLinkedToLibrary('New Lens from Modal', true);

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow existing lens be added by value to a new dashboard', async () => {
      await loadExistingLens();
      await lens.save('Artistpreviouslyknownaslens Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
      await dashboardPanelActions.expectNotLinkedToLibrary(
        'Artistpreviouslyknownaslens Copy',
        true
      );

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow new lens be added by value to an existing dashboard', async () => {
      await createAndSaveDashboard('My Very Cool Dashboard');
      await createNewLens();

      await lens.save(
        'New Lens from Modal',
        false,
        false,
        false,
        'existing',
        'My Very Cool Dashboard'
      );

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Average of bytes', '5,727.322');
      await dashboardPanelActions.expectNotLinkedToLibrary('New Lens from Modal', true);

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow existing lens be added by value to an existing dashboard', async () => {
      await createAndSaveDashboard('My Wonderful Dashboard');
      await loadExistingLens();

      await lens.save(
        'Artistpreviouslyknownaslens Copy',
        true,
        false,
        false,
        'existing',
        'My Wonderful Dashboard'
      );

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
      await dashboardPanelActions.expectNotLinkedToLibrary(
        'Artistpreviouslyknownaslens Copy',
        true
      );

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow new lens to be added by reference to a new dashboard', async () => {
      await createNewLens();
      await lens.save('New by ref Lens from Modal', false, false, true, 'new');

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Average of bytes', '5,727.322');
      await dashboardPanelActions.expectLinkedToLibrary('New by ref Lens from Modal', true);

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow existing lens be added by reference to a new dashboard', async () => {
      await loadExistingLens();
      await lens.save('Artistpreviouslyknownaslens by ref', true, false, true, 'new');

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
      await dashboardPanelActions.expectLinkedToLibrary('Artistpreviouslyknownaslens by ref', true);

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow new lens be added by reference to an existing dashboard', async () => {
      await createAndSaveDashboard('My Very Cool Dashboard 2');
      await createNewLens();

      await lens.save(
        'New Lens by ref from Modal',
        false,
        false,
        true,
        'existing',
        'My Very Cool Dashboard 2'
      );

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Average of bytes', '5,727.322');
      await dashboardPanelActions.expectLinkedToLibrary('New Lens by ref from Modal', true);

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow existing lens be added by reference to an existing dashboard', async () => {
      await createAndSaveDashboard('My Wonderful Dashboard 2');
      await loadExistingLens();

      await lens.save(
        'Artistpreviouslyknownaslens by ref 2',
        true,
        false,
        true,
        'existing',
        'My Wonderful Dashboard 2'
      );

      await dashboard.waitForRenderComplete();

      await lens.assertLegacyMetric('Maximum of bytes', '19,986');
      await dashboardPanelActions.expectLinkedToLibrary(
        'Artistpreviouslyknownaslens by ref 2',
        true
      );

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    // issue #111104
    it('should add a Lens heatmap to the dashboard', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('heatmap', 'heat');

      await lens.waitForVisualization('heatmapChart');
      await lens.openDimensionEditor('lnsHeatmap_cellPanel > lns-dimensionTrigger');
      await lens.openPalettePanel();
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      await header.waitUntilLoadingHasFinished();

      await lens.save('New Lens Heatmap', false, false, true, 'new');

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    describe('Capabilities', function capabilitiesTests() {
      describe('dashboard no-access privileges', () => {
        before(async () => {
          await common.navigateToApp('visualize');
          await security.testUser.setRoles(['test_logstash_reader', 'global_visualize_all']);
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not display dashboard flow prompt', async () => {
          await common.navigateToApp('visualize');
          await header.waitUntilLoadingHasFinished();
          await visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should not display add-to-dashboard options', async () => {
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');
          await lens.goToTimeRange();

          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await lens.switchToVisualization('lnsLegacyMetric');

          await lens.waitForVisualization('legacyMtrVis');
          await lens.assertLegacyMetric('Average of bytes', '5,727.322');

          await lens.waitForVisualization('legacyMtrVis');
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
          await common.navigateToApp('visualize');
          await header.waitUntilLoadingHasFinished();
          await visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should not display add-to-dashboard options', async () => {
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');
          await lens.goToTimeRange();

          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await lens.switchToVisualization('lnsLegacyMetric');

          await lens.waitForVisualization('legacyMtrVis');
          await lens.assertLegacyMetric('Average of bytes', '5,727.322');

          await lens.waitForVisualization('legacyMtrVis');
          await testSubjects.click('lnsApp_saveButton');

          const hasOptions = await testSubjects.exists('add-to-dashboard-options');
          expect(hasOptions).to.eql(false);
        });
      });
    });
  });
}
