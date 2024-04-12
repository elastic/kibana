/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getI18nLocaleFromServerArgs } from '../utils';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const config = getService('config');
  const browser = getService('browser');

  function getTranslationFr(term: string, field?: string, values: number = 3) {
    switch (term) {
      case 'legacyMetric':
        return 'Ancien indicateur';
      case 'datatable':
        return 'Tableau';
      case 'bar':
        return 'Vertical à barres';
      case 'bar_stacked':
        return 'Vertical à barres empilées';
      case 'line':
        return 'Ligne';
      case 'donut':
        return 'Graphique en anneau';
      case 'pie':
        return 'Camembert';
      case 'treemap':
        return 'Compartimentage';
      case 'heatmap':
        return 'Carte thermique';
      case 'Percent':
        return 'Pourcent';
      case 'Number':
        return 'Nombre';
      case 'Linear':
        return 'Linéaire';
      case 'Records':
        return 'Enregistrements';
      case 'records':
        return 'enregistrements';
      case 'moving_average':
        return 'Moyenne mobile de';
      case 'average':
        return field ? `Moyenne de ${field}` : `Moyenne`;
      case 'max':
        return field ? `Maximum de ${field}` : 'Maximum';
      case 'terms':
        return field
          ? `${values} valeurs les plus élevées de ${field}`
          : 'Valeurs les plus élevées';
      case 'sum':
        return 'somme';
      default:
        return term;
    }
  }

  function getTranslationJa(term: string, field?: string, values: number = 3) {
    switch (term) {
      case 'legacyMetric':
        return 'レガシーメトリック';
      case 'datatable':
        return '表';
      case 'bar':
        return '縦棒';
      case 'bar_stacked':
        return '積み上げ縦棒';
      case 'line':
        return '折れ線';
      case 'donut':
        return 'ドーナッツ';
      case 'pie':
        return '円';
      case 'treemap':
        return 'ツリーマップ';
      case 'heatmap':
        return 'ヒートマップ';
      case 'Number':
        return '数字';
      case 'Percent':
        return '割合（%）';
      case 'Linear':
        return '線形';
      case 'Records':
      case 'records':
        return '記録';
      case 'moving_average':
        return 'の移動平均';
      case 'average':
        return field ? `${field} の平均` : `平均`;
      case 'max':
        return field ? `${field} お最高値` : '最高';
      case 'terms':
        return field ? `${field}の上位${values} の値` : 'トップの値';
      case 'sum':
        return '合計';
      default:
        return term;
    }
  }

  function getTranslationZh(term: string, field?: string, values: number = 3) {
    switch (term) {
      case 'legacyMetric':
        return '旧版指标';
      case 'datatable':
        return '表';
      case 'bar':
        return '垂直条形图';
      case 'bar_stacked':
        return '垂直堆积条形图';
      case 'line':
        return '折线图';
      case 'donut':
        return '圆环图';
      case 'pie':
        return '饼图';
      case 'treemap':
        return '树状图';
      case 'heatmap':
        return '热图';
      case 'Number':
        return '数字';
      case 'Percent':
        return '百分比';
      case 'Linear':
        return '线性';
      case 'Records':
      case 'records':
        return '记录';
      case 'moving_average':
        return '的移动平均值';
      case 'average':
        return field ? `${field} 的平均值` : '平均值';
      case 'max':
        return field ? `${field} 的最大值` : '最大值';
      case 'terms':
        return field ? `${field} 的排名前 ${values} 的值` : `排名最前值`;
      case 'sum':
        return '求和';
      default:
        return term;
    }
  }

  function getExpectedI18nTranslator(locale: string): (term: string, field?: string) => string {
    switch (locale) {
      case 'ja-JP':
        return getTranslationJa;
      case 'zh-CN':
        return getTranslationZh;
      case 'fr-FR':
        return getTranslationFr;
      default:
        return (v: string, field?: string) => v;
    }
  }

  describe('lens smokescreen tests', () => {
    let termTranslator: (term: string, field?: string, values?: number) => string;

    before(async () => {
      const serverArgs: string[] = config.get('kbnTestServer.serverArgs');
      const kbnServerLocale = getI18nLocaleFromServerArgs(serverArgs);
      termTranslator = getExpectedI18nTranslator(kbnServerLocale);
      await browser.setWindowSize(1600, 1000);
    });

    it('should allow creation of lens xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: '@message.raw',
      });

      await PageObjects.lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));
      await PageObjects.lens.removeDimension('lnsDatatable_rows');
      await PageObjects.lens.switchToVisualization('bar_stacked', termTranslator('bar_stacked'));

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.save('Afancilenstest');

      // Ensure the visualization shows up in the visualize list, and takes
      // us back to the visualization as we configured it.
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await PageObjects.lens.clickVisualizeListItemTitle('Afancilenstest');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.waitForVisualization('xyVisChart');

      expect(await PageObjects.lens.getTitle()).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 4th item is the other bucket
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(4);
    });

    it('should create an xy visualization with filters aggregation', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      // Change the IP field to filters
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'filters',
        keepOpen: true,
      });
      await PageObjects.lens.addFilterToAgg(`geo.src : CN`);
      await PageObjects.lens.waitForVisualization('xyVisChart');

      // Verify that the field was persisted from the transition
      expect(await PageObjects.lens.getFiltersAggLabels()).to.eql([`"ip" : *`, `geo.src : CN`]);
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should transition from metric to table to metric', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertLegacyMetric(termTranslator('max', 'bytes'), '19,986');
      await PageObjects.lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));
      expect(await PageObjects.lens.getDatatableHeaderText()).to.eql(
        termTranslator('max', 'bytes')
      );
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('19,986');
      await PageObjects.lens.switchToVisualization(
        'lnsLegacyMetric',
        termTranslator('legacyMetric')
      );
      await PageObjects.lens.assertLegacyMetric(termTranslator('max', 'bytes'), '19,986');
    });

    it('should transition from a multi-layer stacked bar to a multi-layer line chart and correctly remove all layers', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.createLayer();

      expect(await PageObjects.lens.hasChartSwitchWarning('line', termTranslator('line'))).to.eql(
        false
      );

      await PageObjects.lens.switchToVisualization('line', termTranslator('line'));
      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });

      expect(await PageObjects.lens.getLayerCount()).to.eql(2);
      await PageObjects.lens.removeLayer();
      await PageObjects.lens.removeLayer();
      await testSubjects.existOrFail('workspace-drag-drop-prompt');
    });

    it('should edit settings of xy line chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.removeDimension('lnsXY_splitDimensionPanel');
      await PageObjects.lens.switchToVisualization('line', termTranslator('line'));
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'max',
        field: 'memory',
        keepOpen: true,
      });
      await PageObjects.lens.editDimensionLabel('Test of label');
      await PageObjects.lens.editDimensionFormat(termTranslator('Percent'));
      await PageObjects.lens.editDimensionColor('#ff0000');
      await PageObjects.lens.openVisualOptions();

      await PageObjects.lens.setCurvedLines('CURVE_MONOTONE_X');
      await PageObjects.lens.editMissingValues('Linear');

      await PageObjects.lens.assertMissingValues(termTranslator('Linear'));

      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await PageObjects.lens.assertColor('#ff0000');

      await testSubjects.existOrFail('indexPattern-dimension-formatDecimals');

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Test of label'
      );
    });

    it('should not show static value tab for data layers', async () => {
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      // Quick functions and Formula tabs should be visible
      expect(await testSubjects.exists('lens-dimensionTabs-quickFunctions')).to.eql(true);
      expect(await testSubjects.exists('lens-dimensionTabs-formula')).to.eql(true);
      // Static value tab should not be visible
      expect(await testSubjects.exists('lens-dimensionTabs-static_value')).to.eql(false);

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should be able to add very long labels and still be able to remove a dimension', async () => {
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      const longLabel =
        'Veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery long label wrapping multiple lines';
      await PageObjects.lens.editDimensionLabel(longLabel);
      await PageObjects.lens.waitForVisualization('xyVisChart');
      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        longLabel
      );
      expect(await PageObjects.lens.canRemoveDimension('lnsXY_yDimensionPanel')).to.equal(true);
      await PageObjects.lens.removeDimension('lnsXY_yDimensionPanel');
      await testSubjects.missingOrFail('lnsXY_yDimensionPanel > lns-dimensionTrigger');
    });

    it('should allow creation of a multi-axis chart and switching multiple times', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('bar', termTranslator('bar'));

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'bytes',
        keepOpen: true,
      });

      await PageObjects.lens.changeAxisSide('right');
      let data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(2);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(true);

      await PageObjects.lens.changeAxisSide('left');
      data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(false);

      await PageObjects.lens.changeAxisSide('right');
      await PageObjects.lens.waitForVisualization('xyVisChart');

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should show value labels on bar charts when enabled', async () => {
      // enable value labels
      await PageObjects.lens.openVisualOptions();
      await testSubjects.click('lns_valueLabels_inside');

      // check for value labels
      let data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.bars?.[0].labels).not.to.eql(0);

      // switch to stacked bar chart
      await PageObjects.lens.switchToVisualization('bar_stacked', termTranslator('bar_stacked'));

      // check for value labels
      data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.bars?.[0].labels).not.to.eql(0);
    });

    it('should override axis title', async () => {
      const axisTitle = 'overridden axis';
      await PageObjects.lens.toggleToolbarPopover('lnsLeftAxisButton');
      await testSubjects.setValue('lnsyLeftAxisTitle', axisTitle, {
        clearWithKeyboard: true,
      });

      let data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].title).to.eql(axisTitle);

      // hide the gridlines
      await testSubjects.click('lnsshowyLeftAxisGridlines');

      data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].gridlines.length).to.eql(0);
    });

    it('should transition from line chart to donut chart and to bar chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      expect(await PageObjects.lens.hasChartSwitchWarning('donut', termTranslator('donut'))).to.eql(
        true
      );
      await PageObjects.lens.switchToVisualization('donut', termTranslator('donut'));

      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel')).to.eql(
        termTranslator('terms', 'ip')
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        termTranslator('average', 'bytes')
      );

      expect(await PageObjects.lens.hasChartSwitchWarning('bar', termTranslator('bar'))).to.eql(
        false
      );
      await PageObjects.lens.switchToVisualization('bar', termTranslator('bar'));
      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        termTranslator('terms', 'ip')
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        termTranslator('average', 'bytes')
      );
    });

    it('should transition from bar chart to line chart using layer chart switch', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchLayerSeriesType('line');
      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        termTranslator('average', 'bytes')
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
        termTranslator('terms', 'ip')
      );
    });

    it('should transition from pie chart to treemap chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsPieVis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsPieVis');
      await PageObjects.lens.goToTimeRange();
      expect(
        await PageObjects.lens.hasChartSwitchWarning('treemap', termTranslator('treemap'))
      ).to.eql(false);
      await PageObjects.lens.switchToVisualization('treemap', termTranslator('treemap'));
      expect(
        await PageObjects.lens.getDimensionTriggersTexts('lnsPie_groupByDimensionPanel')
      ).to.eql([termTranslator('terms', 'geo.dest', 7), termTranslator('terms', 'geo.src')]);
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        termTranslator('average', 'bytes')
      );
    });

    it('should create a pie chart and switch to datatable', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie', termTranslator('pie'));
      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(
        await PageObjects.lens.hasChartSwitchWarning('lnsDatatable', termTranslator('datatable'))
      ).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));

      // Need to provide a fn for these
      //   expect(await PageObjects.lens.getDatatableHeaderText()).to.eql('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.eql(
        termTranslator('average', 'bytes')
      );
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('2015-09-20 00:00');
      expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('6,011.351');
    });

    it('should create a heatmap chart and transition to barchart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('heatmap', termTranslator('heatmap'));

      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_yDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_cellPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await PageObjects.lens.hasChartSwitchWarning('bar', termTranslator('bar'))).to.eql(
        false
      );
      await PageObjects.lens.switchToVisualization('bar', termTranslator('bar'));
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        'bytes'
      );
    });

    it('should create a valid XY chart with references', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        operation: termTranslator('sum'),
        field: 'bytes',
      });
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        field: termTranslator('Records'),
      });
      await PageObjects.lens.closeDimensionEditor();

      // Two Y axes that are both valid
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow formatting on references', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        operation: termTranslator('sum'),
        field: 'bytes',
      });
      await PageObjects.lens.editDimensionFormat(termTranslator('Number'));
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization();

      const values = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 1))
      );
      expect(values).to.eql([
        '-',
        '222,420.00',
        '702,050.00',
        '1,879,613.33',
        '3,482,256.25',
        '4,359,953.00',
      ]);
    });

    /**
     * The edge cases are:
     *
     * 1. Showing errors when creating a partial configuration
     * 2. Being able to drag in a new field while in partial config
     * 3. Being able to switch charts while in partial config
     */
    it('should handle edge cases in reference-based operations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
      });
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(1);

      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(2);

      await PageObjects.lens.dragFieldToDimensionTrigger(
        '@timestamp',
        'lnsXY_xDimensionPanel > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(1);

      expect(
        await PageObjects.lens.hasChartSwitchWarning('lnsDatatable', termTranslator('datatable'))
      ).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));

      // TODO: fix this later on
      //   expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql(
      //     'Cumulative sum of (incomplete)'
      //   );
    });

    it('should keep the field selection while transitioning to every reference-based operation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'differences',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        'bytes'
      );
    });

    it('should not leave an incomplete column in the visualization config with field-based operation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        undefined
      );
    });

    it('should revert to previous configuration and not leave an incomplete column in the visualization config with reference-based operations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: termTranslator('Records'),
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        termTranslator('moving_average')
      );

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      expect(await PageObjects.lens.isDimensionEditorOpen()).to.eql(true);

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        termTranslator('moving_average')
      );
    });

    it('should transition from unique count to last value', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'ip',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'last_value',
        field: 'bytes',
        isPreviousIncompatible: true,
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        'bytes'
      );
    });

    it('should allow to change index pattern', async () => {
      let indexPatternString;
      if (config.get('esTestCluster.ccs')) {
        indexPatternString = 'ftr-remote:log*';
      } else {
        indexPatternString = 'log*';
      }
      await PageObjects.lens.switchFirstLayerIndexPattern(indexPatternString);
      expect(await PageObjects.lens.getFirstLayerIndexPattern()).to.equal(indexPatternString);
    });

    it('should allow filtering by legend on an xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await PageObjects.lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should allow filtering by legend on a pie chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie', termTranslator('pie'));

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'agent.raw',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should show visual options button group for a donut chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchToVisualization('donut', termTranslator('donut'));

      const hasVisualOptionsButton = await PageObjects.lens.hasVisualOptionsButton();
      expect(hasVisualOptionsButton).to.be(true);

      await PageObjects.lens.openVisualOptions();
      await retry.try(async () => {
        expect(await PageObjects.lens.hasEmptySizeRatioButtonGroup()).to.be(true);
      });
    });

    it('should not show visual options button group for a pie chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchToVisualization('pie', termTranslator('pie'));

      const hasVisualOptionsButton = await PageObjects.lens.hasVisualOptionsButton();
      expect(hasVisualOptionsButton).to.be(false);
    });
  });
}
