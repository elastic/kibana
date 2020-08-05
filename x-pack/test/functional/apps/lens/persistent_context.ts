/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'header', 'timePicker']);
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const appsMenu = getService('appsMenu');

  describe('lens query context', () => {
    it('should carry over time range and pinned filters to discover', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange(
        'Sep 06, 2015 @ 06:31:44.000',
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
        'Sep 07, 2015 @ 06:31:44.000',
        'Sep 19, 2025 @ 06:31:44.000'
      );
      await filterBar.toggleFilterEnabled('ip');
      await appsMenu.clickLink('Visualize', { category: 'kibana' });
      await PageObjects.visualize.clickNewVisualization();
      await PageObjects.visualize.waitForVisualizationSelectPage();
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
  });
}
