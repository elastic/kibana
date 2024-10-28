/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header, tagCloud } = getPageObjects([
    'visualize',
    'lens',
    'header',
    'tagCloud',
  ]);
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');

  describe('lens tagcloud', () => {
    before(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsTagcloud', 'Tag cloud');

      await lens.configureDimension({
        dimension: 'lnsTagcloud_tagDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsTagcloud_valueDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await header.waitUntilLoadingHasFinished();
      await lens.waitForVisualization('tagCloudVisualization');

      // avoid picking up tags in suggestion panel by closing panel
      await lens.closeSuggestionPanel();
    });

    it('should render tagcloud', async () => {
      const tags = await tagCloud.getTextTag();
      expect(tags).to.eql([
        '97.220.3.248',
        '78.83.247.30',
        '226.82.228.233',
        '93.28.27.24',
        'Other',
      ]);
    });

    it('should add filter from clicking on tag', async () => {
      await tagCloud.selectTagCloudTag('97.220.3.248');
      await header.waitUntilLoadingHasFinished();
      const hasTagFilter = await filterBar.hasFilter('ip', '97.220.3.248');
      expect(hasTagFilter).to.be(true);
    });

    it('should filter results by filter bar', async () => {
      const tags = await tagCloud.getTextTag();
      expect(tags).to.eql(['97.220.3.248']);
    });
  });
}
