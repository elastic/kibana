/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { PASTEL_PALETTE_LIGHT } from '@kbn/coloring/src/shared_components/color_mapping/palettes/pastel';
import { EUI_PALETTE_COLORS_LIGHT } from '@kbn/coloring/src/shared_components/color_mapping/palettes/eui';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const elasticChart = getService('elasticChart');

  describe('lens color mapping', () => {
    before(async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await elasticChart.setNewChartUiDebugFlag(true);

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
        palette: { mode: 'colorMapping', id: 'pastel' },
        keepOpen: true,
      });
    });

    it('should render correct color mapping', async () => {
      const chart = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      const legendColors = chart?.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
      expect(legendColors).to.eql(PASTEL_PALETTE_LIGHT.slice(0, 5).map((c) => c.toLowerCase()));
    });
    it('should allow switching color mapping palette', async () => {
      await PageObjects.lens.changeColorMappingPalette(
        'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
        'eui'
      );
      const chart = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      const legendColors = chart?.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
      expect(legendColors).to.eql(EUI_PALETTE_COLORS_LIGHT.slice(0, 5).map((c) => c.toLowerCase()));
    });

    it('should change categorical color', async () => {
      await PageObjects.lens.changeColorMappingCategoricalColors(
        'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
        0,
        3
      );
      const chart = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      const firstLegendItemColor = chart?.legend?.items?.[0]?.color?.toLowerCase() ?? 'NONE';
      expect(firstLegendItemColor).to.eql(EUI_PALETTE_COLORS_LIGHT[3].toLowerCase());
    });
  });
}
