/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticBrandPalette } from '@kbn/coloring';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);

  describe('lens color palette tests', () => {
    it('should allow to pick legacy color palette in xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: '@message.raw',
        palette: { mode: 'legacy', id: 'negative' },
        keepOpen: true,
      });

      await PageObjects.lens.assertPalette('negative', true);
    });
    it('should allow to pick color mapping palette in xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: '@message.raw',
        palette: { mode: 'colorMapping', id: ElasticBrandPalette.id },
        keepOpen: true,
      });

      await PageObjects.lens.assertPalette(ElasticBrandPalette.id, false);
      await PageObjects.lens.closeDimensionEditor();
    });

    it('should carry over palette to the pie chart', async () => {
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_sliceByDimensionPanel > lns-dimensionTrigger'
      );
      await PageObjects.lens.assertPalette(ElasticBrandPalette.id, false);
      await PageObjects.lens.closeDimensionEditor();
    });

    it('should carry palette back to the bar chart', async () => {
      await PageObjects.lens.switchToVisualization('bar');
      await PageObjects.lens.openDimensionEditor(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
      );
      await PageObjects.lens.assertPalette(ElasticBrandPalette.id, false);
    });
  });
}
