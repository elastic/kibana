/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens } = getPageObjects(['visualBuilder', 'visualize', 'lens']);

  const testSubjects = getService('testSubjects');

  describe('Gauge', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
      await visualBuilder.resetPage();
      await visualBuilder.clickGauge();
      await visualBuilder.clickDataTab('gauge');
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(true);
    });

    it('should convert to Lens', async () => {
      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('Count of records');
    });
  });
}
