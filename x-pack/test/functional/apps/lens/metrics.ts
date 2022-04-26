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
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');

  describe('lens metrics', () => {
    it('should render a numeric metric', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');
    });

    it('should color the metric text based on value', async () => {
      await PageObjects.lens.openDimensionEditor('lns-dimensionTrigger');
      await PageObjects.lens.setMetricDynamicColoring('labels');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const styleObj = await PageObjects.lens.getMetricStyle();
      expect(styleObj['background-color']).to.be(undefined);
      expect(styleObj.color).to.be('rgb(214, 191, 87)');
    });

    it('should change the color of the metric when tweaking the values in the panel', async () => {
      await PageObjects.lens.openPalettePanel('lnsMetric');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('lnsPalettePanel_dynamicColoring_range_value_1', '21000', {
        clearWithKeyboard: true,
      });
      await PageObjects.lens.waitForVisualization('mtrVis');
      const styleObj = await PageObjects.lens.getMetricStyle();
      expect(styleObj.color).to.be('rgb(32, 146, 128)');
    });

    it('should change the color when reverting the palette', async () => {
      await testSubjects.click('lnsPalettePanel_dynamicColoring_reverseColors');
      await PageObjects.lens.waitForVisualization('mtrVis');
      const styleObj = await PageObjects.lens.getMetricStyle();
      expect(styleObj.color).to.be('rgb(204, 86, 66)');
    });

    it('should reset the color stops when changing palette to a predefined one', async () => {
      await PageObjects.lens.changePaletteTo('temperature');
      await PageObjects.lens.waitForVisualization('mtrVis');
      const styleObj = await PageObjects.lens.getMetricStyle();
      expect(styleObj.color).to.be('rgb(235, 239, 245)');
    });
  });
}
