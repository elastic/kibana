/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const listingTable = getService('listingTable');
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('lens datatable', () => {
    it('should able to sort a table by a column', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      // Sort by number
      await PageObjects.lens.changeTableSortingBy(2, 'ascending');
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableCellText(0, 2)).to.eql('17,246');
      // Now sort by IP
      await PageObjects.lens.changeTableSortingBy(0, 'ascending');
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('78.83.247.30');
      // Change the sorting
      await PageObjects.lens.changeTableSortingBy(0, 'descending');
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('169.228.188.120');
      // Remove the sorting
      await retry.try(async () => {
        await PageObjects.lens.changeTableSortingBy(0, 'none');
        await PageObjects.lens.waitForVisualization();
        expect(await PageObjects.lens.isDatatableHeaderSorted(0)).to.eql(false);
      });
    });

    it('should able to use filters cell actions in table', async () => {
      const firstCellContent = await PageObjects.lens.getDatatableCellText(0, 0);
      await retry.try(async () => {
        await PageObjects.lens.clickTableCellAction(0, 0, 'lensDatatableFilterOut');
        await PageObjects.lens.waitForVisualization();
        expect(
          await find.existsByCssSelector(
            `[data-test-subj*="filter-value-${firstCellContent}"][data-test-subj*="filter-negated"]`
          )
        ).to.eql(true);
      });
    });

    it('should allow to configure column visibility', async () => {
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('Top values of ip');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal('Average of bytes');

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger', 1);

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('Average of bytes');

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger', 4);

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('Top values of ip');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal('Average of bytes');
    });

    it('should allow to transpose columns', async () => {
      await PageObjects.lens.dragDimensionToDimension(
        'lnsDatatable_rows > lns-dimensionTrigger',
        'lnsDatatable_columns > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal(
        '169.228.188.120 › Average of bytes'
      );
      expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal(
        '78.83.247.30 › Average of bytes'
      );
      expect(await PageObjects.lens.getDatatableHeaderText(3)).to.equal(
        '226.82.228.233 › Average of bytes'
      );
    });

    it('should allow to sort by transposed columns', async () => {
      await PageObjects.lens.changeTableSortingBy(2, 'ascending');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDatatableCellText(0, 2)).to.eql('17,246');
    });

    it('should show dynamic coloring feature for numeric columns', async () => {
      await PageObjects.lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await PageObjects.lens.setTableDynamicColoring('text');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const styleObj = await PageObjects.lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be(undefined);
      expect(styleObj.color).to.be('rgb(133, 189, 177)');
    });

    it('should allow to color cell background rather than text', async () => {
      await PageObjects.lens.setTableDynamicColoring('cell');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const styleObj = await PageObjects.lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(133, 189, 177)');
      // should also set text color when in cell mode
      expect(styleObj.color).to.be('rgb(0, 0, 0)');
    });

    it('should open the palette panel to customize the palette look', async () => {
      await PageObjects.lens.openPalettePanel('lnsDatatable');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.changePaletteTo('temperature');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const styleObj = await PageObjects.lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(235, 239, 245)');
    });

    it('should keep the coloring consistent when changing mode', async () => {
      // Change mode from percent to number
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // check that all remained the same
      const styleObj = await PageObjects.lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(235, 239, 245)');
    });

    it('should keep the coloring consistent when moving to custom palette from default', async () => {
      await PageObjects.lens.changePaletteTo('custom');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // check that all remained the same
      const styleObj = await PageObjects.lens.getDatatableCellStyle(0, 2);
      expect(styleObj['background-color']).to.be('rgb(235, 239, 245)');
    });

    it('tweak the color stops numeric value', async () => {
      // restore default palette and percent mode
      await PageObjects.lens.changePaletteTo('temperature');
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_percent');
      // now tweak the value
      await testSubjects.setValue('lnsPalettePanel_dynamicColoring_range_value_0', '30', {
        clearWithKeyboard: true,
      });
      // when clicking on another row will trigger a sorting + update
      await testSubjects.click('lnsPalettePanel_dynamicColoring_range_value_1');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // pick a cell without color as is below the range
      const styleObj = await PageObjects.lens.getDatatableCellStyle(3, 3);
      expect(styleObj['background-color']).to.be(undefined);
      // should also set text color when in cell mode
      expect(styleObj.color).to.be(undefined);
    });

    it('should allow the user to reverse the palette', async () => {
      await testSubjects.click('lnsPalettePanel_dynamicColoring_reverseColors');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const styleObj = await PageObjects.lens.getDatatableCellStyle(1, 1);
      expect(styleObj['background-color']).to.be('rgb(168, 191, 218)');
      // should also set text color when in cell mode
      expect(styleObj.color).to.be('rgb(0, 0, 0)');
      await PageObjects.lens.closePalettePanel();
    });

    it('should allow to show a summary table for metric columns', async () => {
      await PageObjects.lens.setTableSummaryRowFunction('sum');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertExactText(
        '[data-test-subj="lnsDataTable-footer-169.228.188.120-›-Average-of-bytes"]',
        'Sum: 18,994'
      );
    });
  });
}
