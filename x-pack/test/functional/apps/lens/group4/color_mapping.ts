/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  EUI_AMSTERDAM_PALETTE_COLORS,
  ELASTIC_BRAND_PALETTE_COLORS,
  EUIAmsterdamColorBlindPalette,
  ElasticBrandPalette,
} from '@kbn/coloring/src/shared_components/color_mapping/palettes';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const elasticChart = getService('elasticChart');

  describe('lens color mapping', () => {
    before(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await elasticChart.setNewChartUiDebugFlag(true);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
        palette: { mode: 'colorMapping', id: ElasticBrandPalette.id },
        keepOpen: true,
      });
    });

    it('should render correct color mapping', async () => {
      const chart = await lens.getCurrentChartDebugState('xyVisChart');
      const legendColors = chart?.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
      expect(legendColors).to.eql(
        ELASTIC_BRAND_PALETTE_COLORS.slice(0, 5).map((c) => c.toLowerCase())
      );
    });
    it('should allow switching color mapping palette', async () => {
      await lens.changeColorMappingPalette(
        'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
        EUIAmsterdamColorBlindPalette.id
      );
      const chart = await lens.getCurrentChartDebugState('xyVisChart');
      const legendColors = chart?.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
      expect(legendColors).to.eql(
        EUI_AMSTERDAM_PALETTE_COLORS.slice(0, 5).map((c) => c.toLowerCase())
      );
    });

    it('should change categorical color', async () => {
      await lens.changeColorMappingCategoricalColors(
        'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
        0,
        3
      );
      const chart = await lens.getCurrentChartDebugState('xyVisChart');
      const firstLegendItemColor = chart?.legend?.items?.[0]?.color?.toLowerCase() ?? 'NONE';
      expect(firstLegendItemColor).to.eql(EUI_AMSTERDAM_PALETTE_COLORS[3].toLowerCase());
    });
  });
}
