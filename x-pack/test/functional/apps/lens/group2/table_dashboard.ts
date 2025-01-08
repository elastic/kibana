/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { lens, visualize, dashboard } = getPageObjects(['lens', 'visualize', 'dashboard']);
  const listingTable = getService('listingTable');
  const retry = getService('retry');

  const checkTableSorting = async () => {
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
      await lens.changeTableSortingBy(0, 'ascending');
      await lens.waitForVisualization();
      expect(await lens.isDatatableHeaderSorted(0)).to.eql(false);
    });
  };

  describe('lens table on dashboard', () => {
    it('should sort a table by column in dashboard edit mode', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');
      await lens.save('New Table', true, false, false, 'new');

      await checkTableSorting();
    });

    it('should sort a table by column in dashboard view mode', async () => {
      await dashboard.saveDashboard('Dashboard with a Lens Table');

      await checkTableSorting();
    });
  });
}
