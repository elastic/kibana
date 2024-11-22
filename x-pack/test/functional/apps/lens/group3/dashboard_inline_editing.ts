/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, visualize, lens, timeToVisualize } = getPageObjects([
    'dashboard',
    'visualize',
    'lens',
    'timeToVisualize',
  ]);
  const find = getService('find');
  const log = getService('log');
  const listingTable = getService('listingTable');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');

  const createNewLens = async () => {
    await visualize.navigateToNewVisualization();
    await visualize.clickVisType('lens');

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await lens.switchToVisualization('lnsMetric');
    await lens.waitForVisualization('mtrVis');
  };

  const loadExistingLens = async () => {
    await visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName('lnsXYvis');
    await lens.clickVisualizeListItemTitle('lnsXYvis');
    await lens.waitForVisualization('xyVisChart');
  };

  describe('lens inline editing tests', () => {
    it('should allow inline editing of a by value visualization', async () => {
      await createNewLens();
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();
      const data = await lens.getMetricVisualizationData();
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

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow inline editing of a by reference visualization', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.legacySaveToLibrary('My by reference visualization');

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Removes breakdown dimension');

      await lens.removeDimension('lnsXY_splitDimensionPanel');

      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      await timeToVisualize.resetNewDashboard();
    });

    it('should reset changes made to the previous state', async () => {
      await createNewLens();
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });

      log.debug('Cancels the changes');
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getMetricVisualizationData();
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
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow adding an annotation', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds annotation');

      await lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');

      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();
      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow adding a reference line', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds reference line');

      await lens.createLayer('referenceLine');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await lens.selectOptionFromComboBox('lns-icon-select', 'bell');
      await lens.closeDimensionEditor();
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      await testSubjects.existOrFail('xyVisAnnotationIcon');

      await timeToVisualize.resetNewDashboard();
    });
  });
}
