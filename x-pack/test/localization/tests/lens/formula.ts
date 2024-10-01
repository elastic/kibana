/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const elasticChart = getService('elasticChart');

  describe('lens formula tests', () => {
    it('should allow creation of a lens chart via formula', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await lens.goToTimeRange();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `ifelse(count() > 1, (count() + average(bytes)) / 2, 5)`,
      });

      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data).to.be.ok();
    });
  });
}
