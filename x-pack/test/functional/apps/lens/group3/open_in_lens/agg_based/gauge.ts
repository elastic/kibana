/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, lens, timePicker } = getPageObjects(['visualize', 'lens', 'timePicker']);

  describe('Gauge', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickGauge();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('gaugeChart');
    });
  });
}
