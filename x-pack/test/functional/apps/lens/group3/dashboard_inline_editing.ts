/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
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
  const log = getService('log');
  const listingTable = getService('listingTable');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');

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
  };

  const loadExistingLens = async () => {
    await PageObjects.visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName('lnsXYvis');
    await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
    await PageObjects.lens.goToTimeRange();
    await PageObjects.lens.waitForVisualization('xyVisChart');
  };

  describe('lens inline editing tests', () => {
    it('should allow inline editing of a by value visualization', async () => {
      await createNewLens();
      await PageObjects.lens.save('New Lens from Modal', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });
      await testSubjects.click('applyFlyoutButton');
      await PageObjects.dashboard.waitForRenderComplete();
      const data = await PageObjects.lens.getMetricVisualizationData();
      const expectedData = [
        {
          title: 'Average of bytes',
          subtitle: undefined,
          extraText: 'Maximum of bytes 19,986',
          value: '5,727.322',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingTrendline: false,
          showingBar: false,
        },
      ];

      log.debug(data);
      expect(data).to.eql(expectedData);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow inline editing of a by reference visualization', async () => {
      await loadExistingLens();
      await PageObjects.lens.save('xyVisChart Copy', true, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.legacySaveToLibrary('My by reference visualization');

      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Removes breakdown dimension');

      await PageObjects.lens.removeDimension('lnsXY_splitDimensionPanel');

      await testSubjects.click('applyFlyoutButton');
      await PageObjects.dashboard.waitForRenderComplete();

      const data = await PageObjects.lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should reset changes made to the previous state', async () => {
      await createNewLens();
      await PageObjects.lens.save('New Lens from Modal', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });

      log.debug('Cancels the changes');
      await testSubjects.click('cancelFlyoutButton');
      await PageObjects.dashboard.waitForRenderComplete();

      const data = await PageObjects.lens.getMetricVisualizationData();
      const expectedData = [
        {
          title: 'Average of bytes',
          subtitle: undefined,
          extraText: '',
          value: '5,727.322',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingTrendline: false,
          showingBar: false,
        },
      ];

      expect(data).to.eql(expectedData);
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow adding an annotation', async () => {
      await loadExistingLens();
      await PageObjects.lens.save('xyVisChart Copy', true, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds annotation');

      await PageObjects.lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');

      await testSubjects.click('applyFlyoutButton');
      await PageObjects.dashboard.waitForRenderComplete();
      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('should allow adding a reference line', async () => {
      await loadExistingLens();
      await PageObjects.lens.save('xyVisChart Copy', true, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds reference line');

      await PageObjects.lens.createLayer('referenceLine');

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await PageObjects.lens.selectOptionFromComboBox('lns-icon-select', 'bell');
      await PageObjects.lens.closeDimensionEditor();
      await testSubjects.click('applyFlyoutButton');
      await PageObjects.dashboard.waitForRenderComplete();

      await testSubjects.existOrFail('xyVisAnnotationIcon');

      await PageObjects.timeToVisualize.resetNewDashboard();
    });
  });
}
