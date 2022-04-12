/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'visualize',
    'lens',
    'header',
    'timePicker',
    'common',
    'navigationalSearch',
  ]);
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const appsMenu = getService('appsMenu');
  const security = getService('security');
  const listingTable = getService('listingTable');
  const queryBar = getService('queryBar');

  describe('lens query context', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_discover_read', 'global_visualize_read', 'test_logstash_reader'],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('Navigation search', () => {
      describe('when opening from empty visualization to existing one', () => {
        before(async () => {
          await PageObjects.visualize.navigateToNewVisualization();
          await PageObjects.visualize.clickVisType('lens');
          await PageObjects.lens.goToTimeRange();
          await PageObjects.navigationalSearch.focus();
          await PageObjects.navigationalSearch.searchFor('type:lens lnsTableVis');
          await PageObjects.navigationalSearch.clickOnOption(0);
          await PageObjects.lens.waitForWorkspaceWithVisualization();
        });
        it('filters, time and query reflect the visualization state', async () => {
          expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal(
            '404 › Median of bytes'
          );
          expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal(
            '503 › Median of bytes'
          );
          expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('TG');
          expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('9,931');
        });
        it('preserves time range', async () => {
          const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
          expect(timePickerValues.start).to.eql(PageObjects.timePicker.defaultStartTime);
          expect(timePickerValues.end).to.eql(PageObjects.timePicker.defaultEndTime);
          // data is correct and top nav is correct
        });
        it('loads filters', async () => {
          const filterCount = await filterBar.getFilterCount();
          expect(filterCount).to.equal(1);
        });
        it('loads query', async () => {
          const query = await queryBar.getQueryString();
          expect(query).to.equal('extension.raw : "jpg" or extension.raw : "gif" ');
        });
      });
      describe('when opening from existing visualization to empty one', () => {
        before(async () => {
          await PageObjects.visualize.gotoVisualizationLandingPage();
          await listingTable.searchForItemWithName('lnsTableVis');
          await PageObjects.lens.clickVisualizeListItemTitle('lnsTableVis');
          await PageObjects.lens.goToTimeRange();
          await PageObjects.navigationalSearch.focus();
          await PageObjects.navigationalSearch.searchFor('type:application lens');
          await PageObjects.navigationalSearch.clickOnOption(0);
          await PageObjects.lens.waitForEmptyWorkspace();
          await PageObjects.lens.switchToVisualization('lnsMetric');
          await PageObjects.lens.dragFieldToWorkspace('@timestamp', 'mtrVis');
        });
        it('preserves time range', async () => {
          // fill the navigation search and select empty
          // see the time
          const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
          expect(timePickerValues.start).to.eql(PageObjects.timePicker.defaultStartTime);
          expect(timePickerValues.end).to.eql(PageObjects.timePicker.defaultEndTime);
        });
        it('cleans filters', async () => {
          const filterCount = await filterBar.getFilterCount();
          expect(filterCount).to.equal(0);
        });
        it('cleans query', async () => {
          const query = await queryBar.getQueryString();
          expect(query).to.equal('');
        });
        it('filters, time and query reflect the visualization state', async () => {
          await PageObjects.lens.assertMetric('Unique count of @timestamp', '14,181');
        });
      });
    });

    describe('Switching in Visualize App', () => {
      it('when moving from existing to empty workspace, preserves time range, cleans filters and query', async () => {
        // go to existing vis
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsTableVis');
        await PageObjects.lens.clickVisualizeListItemTitle('lnsTableVis');
        await PageObjects.lens.goToTimeRange();
        // go to empty vis
        await PageObjects.lens.goToListingPageViaBreadcrumbs();
        await PageObjects.visualize.clickNewVisualization();
        await PageObjects.visualize.waitForGroupsSelectPage();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.waitForEmptyWorkspace();
        await PageObjects.lens.switchToVisualization('lnsMetric');
        await PageObjects.lens.dragFieldToWorkspace('@timestamp', 'mtrVis');

        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.eql(PageObjects.timePicker.defaultStartTime);
        expect(timePickerValues.end).to.eql(PageObjects.timePicker.defaultEndTime);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(0);
        const query = await queryBar.getQueryString();
        expect(query).to.equal('');
        await PageObjects.lens.assertMetric('Unique count of @timestamp', '14,181');
      });
      it('when moving from empty to existing workspace, preserves time range and loads filters and query', async () => {
        // go to existing vis
        await PageObjects.lens.goToListingPageViaBreadcrumbs();
        await listingTable.searchForItemWithName('lnsTableVis');
        await PageObjects.lens.clickVisualizeListItemTitle('lnsTableVis');

        expect(await PageObjects.lens.getDatatableHeaderText(1)).to.equal('404 › Median of bytes');
        expect(await PageObjects.lens.getDatatableHeaderText(2)).to.equal('503 › Median of bytes');
        expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('TG');
        expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('9,931');

        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.eql(PageObjects.timePicker.defaultStartTime);
        expect(timePickerValues.end).to.eql(PageObjects.timePicker.defaultEndTime);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
        const query = await queryBar.getQueryString();
        expect(query).to.equal('extension.raw : "jpg" or extension.raw : "gif" ');
      });
    });

    it('should carry over time range and pinned filters to discover', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange(
        'Sep 6, 2015 @ 06:31:44.000',
        'Sep 18, 2025 @ 06:31:44.000'
      );
      await filterBar.addFilter('ip', 'is', '97.220.3.248');
      await filterBar.toggleFilterPinned('ip');
      await PageObjects.header.clickDiscover();
      const timeRange = await PageObjects.timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 6, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 18, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', true, true);
    });

    it('should remember time range and pinned filters from discover', async () => {
      await PageObjects.lens.goToTimeRange(
        'Sep 7, 2015 @ 06:31:44.000',
        'Sep 19, 2025 @ 06:31:44.000'
      );
      await filterBar.toggleFilterEnabled('ip');
      await appsMenu.clickLink('Visualize Library', { category: 'kibana' });
      await PageObjects.visualize.clickNewVisualization();
      await PageObjects.visualize.waitForGroupsSelectPage();
      await PageObjects.visualize.clickVisType('lens');
      const timeRange = await PageObjects.timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', false, true);
    });

    it('keep time range and pinned filters after refresh', async () => {
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const timeRange = await PageObjects.timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', false, true);
    });

    it('keeps selected index pattern after refresh', async () => {
      await PageObjects.lens.switchDataPanelIndexPattern('log*');
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDataPanelIndexPattern()).to.equal('log*');
    });

    it('keeps time range and pinned filters after refreshing directly after saving', async () => {
      // restore defaults so visualization becomes saveable
      await security.testUser.restoreDefaults();
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
      await PageObjects.lens.save('persistentcontext');
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const timeRange = await PageObjects.timePicker.getTimeConfig();
      expect(timeRange.start).to.equal('Sep 7, 2015 @ 06:31:44.000');
      expect(timeRange.end).to.equal('Sep 19, 2025 @ 06:31:44.000');
      await filterBar.hasFilter('ip', '97.220.3.248', false, true);
    });
  });
}
