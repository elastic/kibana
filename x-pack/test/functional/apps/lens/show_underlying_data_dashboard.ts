/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'dashboard', 'header', 'discover']);

  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const filterBarService = getService('filterBar');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('lens show underlying data dashboard', () => {
    it('should show the open button for a compatible saved visualization', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.save('Embedded Visualization', true, false, false, 'new');

      await PageObjects.dashboard.saveDashboard('Open in Discover Testing', {
        exitFromEditMode: true,
      });

      await dashboardPanelActions.openContextMenuMorePanel();

      await testSubjects.click('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER');

      // // const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      // // await browser.switchToWindow(discoverWindowHandle);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverChart');
      // check the table columns
      const columns = await PageObjects.discover.getColumnHeaders();
      expect(columns).to.eql(['ip', '@timestamp', 'bytes']);
      // // await browser.closeCurrentWindow();
      // // await browser.switchToWindow(lensWindowHandler);
    });

    it('should bring both dashboard filters and visualization filters to discover', async () => {
      await browser.goBack();

      await PageObjects.dashboard.switchToEditMode();
      await dashboardPanelActions.clickEdit();

      await filterBarService.addFilter('geo.src', 'is', 'AF');

      await retry.waitFor('filter to be added', async () => {
        return (await filterBarService.getFilterCount()) === 1;
      });

      await PageObjects.lens.saveAndReturn();

      await filterBarService.addFilter(
        'host.raw',
        'is',
        'cdn.theacademyofperformingartsandscience.org'
      );

      await PageObjects.dashboard.clickQuickSave();

      await PageObjects.dashboard.clickCancelOutOfEditMode();

      await dashboardPanelActions.openContextMenuMorePanel();

      await testSubjects.click('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER');

      expect(await filterBarService.getFilterCount()).to.be(2);
      const filterLabels = await filterBarService.getFiltersLabel();
      expect(filterLabels).to.contain('host.raw: cdn.theacademyofperformingartsandscience.org');
      expect(filterLabels).to.contain('geo.src: AF');
    });
  });
}
