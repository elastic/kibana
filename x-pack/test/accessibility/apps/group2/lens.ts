/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, visualize, timePicker, lens } = getPageObjects([
    'common',
    'visualize',
    'timePicker',
    'lens',
  ]);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const indexPattern = 'log*';

  const hasFocus = async (testSubject: string) => {
    const targetElement = await testSubjects.find(testSubject);
    const activeElement = await find.activeElement();
    return (await targetElement._webElement.getId()) === (await activeElement._webElement.getId());
  };

  describe('Lens Accessibility', () => {
    const lensChartName = 'MyLensChart';
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it('lens', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await timePicker.ensureHiddenNoDataPopover();
      await visualize.selectIndexPattern(indexPattern);
      await a11y.testAppSnapshot();
    });

    it('lens XY chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await timePicker.ensureHiddenNoDataPopover();
      await visualize.selectIndexPattern(indexPattern);
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

      await a11y.testAppSnapshot();
    });

    it('lens pie chart', async () => {
      await lens.switchToVisualization('pie');
      await a11y.testAppSnapshot();
    });

    it('lens datatable', async () => {
      await lens.switchToVisualization('lnsDatatable');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with dynamic cell colouring', async () => {
      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await lens.setTableDynamicColoring('cell');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with dynamic text colouring', async () => {
      await lens.setTableDynamicColoring('text');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with palette panel open', async () => {
      await lens.openPalettePanel();
      await a11y.testAppSnapshot();
    });

    it('lens datatable with custom palette stops', async () => {
      await lens.changePaletteTo('custom');
      await a11y.testAppSnapshot();
      await lens.closePaletteEditor();
      await lens.closeDimensionEditor();
    });

    it('lens metric chart', async () => {
      await lens.switchToVisualization('lnsLegacyMetric');
      await a11y.testAppSnapshot();
    });

    it('dimension configuration panel', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await timePicker.ensureHiddenNoDataPopover();
      await visualize.selectIndexPattern(indexPattern);
      await lens.goToTimeRange();

      await lens.openDimensionEditor('lnsXY_xDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await lens.closeDimensionEditor();
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await lens.closeDimensionEditor();
    });

    it('change chart type', async () => {
      await lens.openChartSwitchPopover();
      await lens.waitForSearchInputValue('line');
      await a11y.testAppSnapshot();
      await testSubjects.click('lnsChartSwitchPopover_line');
    });

    it('change chart type via suggestions', async () => {
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await testSubjects.click('lnsSuggestion-barVerticalStacked > lnsSuggestion');
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with multiple layers', async () => {
      await lens.createLayer();

      await lens.switchToVisualization('area');
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with reference line layer', async () => {
      await lens.createLayer('referenceLine');
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with annotations layer', async () => {
      await lens.createLayer('annotations');
      await a11y.testAppSnapshot();
    });

    it('saves lens chart', async () => {
      await lens.save(lensChartName);
      await a11y.testAppSnapshot();
      // delete newly created Lens
      await common.navigateToApp('visualize');
      await listingTable.searchForItemWithName(lensChartName);
      await listingTable.checkListingSelectAllCheckbox();
      await listingTable.clickDeleteSelected();
      await common.clickConfirmOnModal();
    });

    describe('focus behavior when adding or removing layers', () => {
      it('should focus the added layer', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await visualize.selectIndexPattern(indexPattern);
        await lens.createLayer();
        expect(await hasFocus('lns-layerPanel-1')).to.be(true);
      });
      it('should focus the remaining layer when the first is removed', async () => {
        await lens.removeLayer(0);
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
        await lens.createLayer();
        await lens.removeLayer(1);
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
      });
      it('should focus the only layer when resetting the layer', async () => {
        await lens.removeLayer();
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
      });
    });
  });
}
