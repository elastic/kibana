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
      await PageObjects.lens.changeTableSortingBy(2, 'asc');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDatatableCellText(0, 2)).to.eql('17,246');
      // Now sort by IP
      await PageObjects.lens.changeTableSortingBy(0, 'asc');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('78.83.247.30');
      // Change the sorting
      await PageObjects.lens.changeTableSortingBy(0, 'desc');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('169.228.188.120');
      // Remove the sorting
      await PageObjects.lens.changeTableSortingBy(0, 'none');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.isDatatableHeaderSorted(0)).to.eql(false);
    });

    it('should able to use filters cell actions in table', async () => {
      const firstCellContent = await PageObjects.lens.getDatatableCellText(0, 0);
      await retry.try(async () => {
        await PageObjects.lens.clickTableCellAction(0, 0, 'lensDatatableFilterOut');
        await PageObjects.header.waitUntilLoadingHasFinished();
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

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_column > lns-dimensionTrigger');

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('Average of bytes');

      await PageObjects.lens.toggleColumnVisibility('lnsDatatable_column > lns-dimensionTrigger');

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('Top values of ip');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal('Average of bytes');
    });
  });
}
