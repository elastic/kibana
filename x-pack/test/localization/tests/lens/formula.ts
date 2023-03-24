/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens']);
  const elasticChart = getService('elasticChart');

  describe('lens formula tests', () => {
    it('should allow creation of a lens chart via formula', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `count() + average(bytes)`,
      });

      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(0);
      const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      expect(data).to.be.ok();
    });
  });
}
