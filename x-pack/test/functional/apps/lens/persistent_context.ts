/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'header', 'timePicker']);
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const appsMenu = getService('appsMenu');
  const security = getService('security');

  describe('lens query context', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_discover_read', 'global_visualize_read', 'test_logstash_reader'],
        false
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
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
