/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['lens', 'visualize', 'dashboard']);
  const listingTable = getService('listingTable');
  const retry = getService('retry');

  const checkTableSorting = async () => {
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
  };

  describe('lens table on dashboard', () => {
    it('should sort a table by column in dashboard edit mode', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.lens.save('New Table', true, false, false, 'new');

      await checkTableSorting();
    });

    it('should sort a table by column in dashboard view mode', async () => {
      await PageObjects.dashboard.saveDashboard('Dashboard with a Lens Table');

      await checkTableSorting();
    });
  });
}
