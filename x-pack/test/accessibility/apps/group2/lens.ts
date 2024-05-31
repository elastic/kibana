/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker', 'home', 'lens']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');

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
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();
      await a11y.testAppSnapshot();
    });

    it('lens XY chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();
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

      await a11y.testAppSnapshot();
    });

    it('lens pie chart', async () => {
      await PageObjects.lens.switchToVisualization('pie');
      await a11y.testAppSnapshot();
    });

    it('lens datatable', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with dynamic cell colouring', async () => {
      await PageObjects.lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await PageObjects.lens.setTableDynamicColoring('cell');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with dynamic text colouring', async () => {
      await PageObjects.lens.setTableDynamicColoring('text');
      await a11y.testAppSnapshot();
    });

    it('lens datatable with palette panel open', async () => {
      await PageObjects.lens.openPalettePanel();
      await a11y.testAppSnapshot();
    });

    it('lens datatable with custom palette stops', async () => {
      await PageObjects.lens.changePaletteTo('custom');
      await a11y.testAppSnapshot();
      await PageObjects.lens.closePaletteEditor();
      await PageObjects.lens.closeDimensionEditor();
    });

    it('lens metric chart', async () => {
      await PageObjects.lens.switchToVisualization('lnsLegacyMetric');
      await a11y.testAppSnapshot();
    });

    it('dimension configuration panel', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.timePicker.ensureHiddenNoDataPopover();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.openDimensionEditor('lnsXY_xDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-empty-dimension');
      await a11y.testAppSnapshot();

      await PageObjects.lens.closeDimensionEditor();
    });

    it('change chart type', async () => {
      await PageObjects.lens.openChartSwitchPopover();
      await PageObjects.lens.waitForSearchInputValue('line');
      await a11y.testAppSnapshot();
      await testSubjects.click('lnsChartSwitchPopover_line');
    });

    it('change chart type via suggestions', async () => {
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

      await testSubjects.click('lnsSuggestion-barVerticalStacked > lnsSuggestion');
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with multiple layers', async () => {
      await PageObjects.lens.createLayer();

      await PageObjects.lens.switchToVisualization('area');
      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with reference line layer', async () => {
      await PageObjects.lens.createLayer('referenceLine');
      await a11y.testAppSnapshot();
    });

    it('lens XY chart with annotations layer', async () => {
      await PageObjects.lens.createLayer('annotations');
      await a11y.testAppSnapshot();
    });

    it('saves lens chart', async () => {
      await PageObjects.lens.save(lensChartName);
      await a11y.testAppSnapshot();
      // delete newly created Lens
      await PageObjects.common.navigateToApp('visualize');
      await listingTable.searchForItemWithName(lensChartName);
      await listingTable.checkListingSelectAllCheckbox();
      await listingTable.clickDeleteSelected();
      await PageObjects.common.clickConfirmOnModal();
    });

    describe('focus behavior when adding or removing layers', () => {
      it('should focus the added layer', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.createLayer();
        expect(await hasFocus('lns-layerPanel-1')).to.be(true);
      });
      it('should focus the remaining layer when the first is removed', async () => {
        await PageObjects.lens.removeLayer(0);
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
        await PageObjects.lens.createLayer();
        await PageObjects.lens.removeLayer(1);
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
      });
      it('should focus the only layer when resetting the layer', async () => {
        await PageObjects.lens.removeLayer();
        expect(await hasFocus('lns-layerPanel-0')).to.be(true);
      });
    });
  });
}
