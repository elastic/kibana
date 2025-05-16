/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const listingTable = getService('listingTable');
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('lens datatable', () => {
    it('should able to sort a table by a column', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');
      await lens.switchToVisualization('lnsDatatable');
      // Sort by number
      await lens.changeTableSortingBy(2, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 2)).to.eql('17,246');
      // Now sort by IP
      await lens.changeTableSortingBy(0, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 0)).to.eql('78.83.247.30');
      // Change the sorting
      await lens.changeTableSortingBy(0, 'descending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 0)).to.eql('169.228.188.120');
      // Remove the sorting
      await retry.try(async () => {
        await lens.changeTableSortingBy(0, 'descending');
        await lens.waitForVisualization();
        expect(await lens.isDatatableHeaderSorted(0)).to.eql(false);
      });
    });

    it('should able to sort a last_value column correctly in a table', async () => {
      // configure last_value with a keyword field
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'last_value',
        field: 'geo.dest',
      });

      await lens.changeTableSortingBy(3, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 3)).to.eql('CN');

      await lens.changeTableSortingBy(3, 'descending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 3)).to.eql('PH');

      // now configure a new one with an ip field
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'last_value',
        field: 'ip',
      });
      await lens.changeTableSortingBy(4, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 4)).to.eql('78.83.247.30');
      // Change the sorting
      await lens.changeTableSortingBy(4, 'descending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 0)).to.eql('169.228.188.120');

      await retry.try(async () => {
        await lens.changeTableSortingBy(4, 'descending');
        await lens.waitForVisualization();
        expect(await lens.isDatatableHeaderSorted(0)).to.eql(false);
      });

      // clear all metrics and reconfigure the default
      await lens.removeDimension('lnsDatatable_metrics');
      await lens.removeDimension('lnsDatatable_metrics');
      await lens.removeDimension('lnsDatatable_metrics');
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    it('should able to use filters cell actions in table', async () => {
      const firstCellContent = await lens.getDatatableCellText(0, 0);
      await retry.try(async () => {
        await lens.clickTableCellAction(0, 0, 'lensDatatableFilterOut');
        await lens.waitForVisualization();
        expect(
          await find.existsByCssSelector(
            `[data-test-subj*="filter-value-${firstCellContent}"][data-test-subj*="filter-negated"]`
          )
        ).to.eql(true);
      });
    });

    it('should allow to configure column visibility', async () => {
      expect(await lens.getDatatableHeaderText(0)).to.equal('Top 3 values of ip');
      expect(await lens.getDatatableHeaderText(1)).to.equal('@timestamp per 3 hours');
      expect(await lens.getDatatableHeaderText(2)).to.equal('Average of bytes');

      await lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger', 1);

      expect(await lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await lens.getDatatableHeaderText(1)).to.equal('Average of bytes');

      await lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger', 4);

      expect(await lens.getDatatableHeaderText(0)).to.equal('Top 3 values of ip');
      expect(await lens.getDatatableHeaderText(1)).to.equal('@timestamp per 3 hours');
      expect(await lens.getDatatableHeaderText(2)).to.equal('Average of bytes');
    });

    it('should allow to transpose columns', async () => {
      await lens.dragDimensionToDimension({
        from: 'lnsDatatable_rows > lns-dimensionTrigger',
        to: 'lnsDatatable_columns > lns-empty-dimension',
      });
      // await common.sleep(100000);
      expect(await lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await lens.getDatatableHeaderText(1)).to.equal('169.228.188.120 › Average of bytes');
      expect(await lens.getDatatableHeaderText(2)).to.equal('78.83.247.30 › Average of bytes');
      expect(await lens.getDatatableHeaderText(3)).to.equal('226.82.228.233 › Average of bytes');
    });

    it('should allow to sort by transposed columns', async () => {
      await lens.changeTableSortingBy(2, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 2)).to.eql('17,246');
    });

    it('should show dynamic coloring feature for numeric columns', async () => {
      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await lens.setTableDynamicColoring('text');
      await lens.waitForVisualization();
      const styleObj = await lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be(undefined);
      expect(styleObj.color).to.be('rgb(140, 217, 187)');
    });

    it('should allow to color cell background rather than text', async () => {
      await lens.setTableDynamicColoring('cell');
      await lens.waitForVisualization();
      const styleObj = await lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(140, 217, 187)');
      // should also set text color when in cell mode
      expect(styleObj.color).to.be('rgb(0, 0, 0)');
    });

    it('should open the palette panel to customize the palette look', async () => {
      await lens.openPalettePanel();
      await lens.waitForVisualization();
      await lens.changePaletteTo('temperature');
      await lens.waitForVisualization();
      const styleObj = await lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(232, 241, 255)');
    });

    it('should keep the coloring consistent when changing mode', async () => {
      // Change mode from percent to number
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      await lens.waitForVisualization();
      // check that all remained the same
      const styleObj = await lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(232, 241, 255)');
    });

    it('should keep the coloring consistent when moving to custom palette from default', async () => {
      await lens.changePaletteTo('custom');
      await lens.waitForVisualization();
      // check that all remained the same
      const styleObj = await lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(232, 241, 255)');
    });

    it('tweak the color stops numeric value', async () => {
      // restore default palette and percent mode
      await lens.changePaletteTo('temperature');
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_percent');
      // now tweak the value
      await testSubjects.setValue('lnsPalettePanel_dynamicColoring_range_value_0', '30', {
        clearWithKeyboard: true,
      });
      // when clicking on another row will trigger a sorting + update
      await testSubjects.click('lnsPalettePanel_dynamicColoring_range_value_1');
      await lens.waitForVisualization();
      // pick a cell without color as is below the range
      const styleObj = await lens.getDatatableCellStyle(3, 3);
      expect(styleObj['background-color']).to.be(undefined);
      // should also set text color when in cell mode
      expect(styleObj.color).to.be(undefined);
    });

    it('should allow the user to reverse the palette', async () => {
      await testSubjects.click('lnsPalettePanel_dynamicColoring_reverseColors');
      await lens.waitForVisualization();
      const styleObj = await lens.getDatatableCellStyle(1, 1);
      expect(styleObj['background-color']).to.be('rgb(168, 202, 255)');
      // should also set text color when in cell mode
      expect(styleObj.color).to.be('rgb(0, 0, 0)');
      await lens.closePalettePanel();
    });

    it('should allow to show a summary table for metric columns', async () => {
      await lens.setTableSummaryRowFunction('sum');
      await lens.waitForVisualization();
      await lens.assertExactText(
        '[data-test-subj="lnsDataTable-footer-169.228.188.120-›-Average-of-bytes"]',
        'Sum: 18,994'
      );
    });
  });
}
