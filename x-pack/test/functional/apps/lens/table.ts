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

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger');

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('Average of bytes');

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_rows > lns-dimensionTrigger');

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
  });
}
