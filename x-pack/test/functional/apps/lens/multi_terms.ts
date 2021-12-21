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
  const elasticChart = getService('elasticChart');

  describe('lens multi terms suite', () => {
    it('should allow creation of lens xy chart with multi terms categories', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
        keepOpen: true,
      });

      await PageObjects.lens.addTermToAgg('geo.dest');

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0)).to.eql(
        'Top values of geo.src + 1 other'
      );

      await PageObjects.lens.openDimensionEditor('lnsXY_xDimensionPanel');

      await PageObjects.lens.addTermToAgg('bytes');

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0)).to.eql(
        'Top values of geo.src + 2 others'
      );

      const data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data!.bars![0].bars[0].x).to.eql('PE › US › 19,986');
    });

    it('should allow creation of lens xy chart with multi terms categories split', async () => {
      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
        keepOpen: true,
      });

      await PageObjects.lens.addTermToAgg('geo.dest');
      await PageObjects.lens.addTermToAgg('bytes');

      await PageObjects.lens.closeDimensionEditor();

      const data = await PageObjects.lens.getCurrentChartDebugState();
      expect(data?.bars?.[0]?.name).to.eql('PE › US › 19,986');
    });

    it('should not show existing defined fields for new term', async () => {
      await PageObjects.lens.openDimensionEditor('lnsXY_splitDimensionPanel');

      await PageObjects.lens.checkTermsAreNotAvailableToAgg(['bytes', 'geo.src', 'geo.dest']);

      await PageObjects.lens.closeDimensionEditor();
    });
  });
}
