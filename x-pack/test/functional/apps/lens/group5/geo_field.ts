/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header, maps, common, timePicker } = getPageObjects([
    'visualize',
    'lens',
    'header',
    'maps',
    'common',
    'timePicker',
  ]);
  const from = 'Sep 22, 2015 @ 00:00:00.000';
  const to = 'Sep 22, 2015 @ 04:00:00.000';

  describe('lens visualize geo field tests', () => {
    before(async () => {
      await common.setTime({ from, to });
    });

    after(async () => {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    it('should visualize geo fields in maps', async () => {
      // as navigation does not happen via URL refresh by default, force a reset via URL navigation
      await visualize.navigateToNewVisualization({ forceRefresh: true });
      await visualize.clickVisType('lens');
      await lens.switchDataPanelIndexPattern('logstash-*');
      await header.waitUntilLoadingHasFinished();
      await lens.dragFieldToGeoFieldWorkspace('geo.coordinates');

      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();
      const doesLayerExist = await maps.doesLayerExist('logstash-*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await maps.getLayerTocTooltipMsg('logstash-*');
      expect(tooltipText).to.equal(
        'logstash-*\nFound 66 documents.\nResults narrowed by global time'
      );
      await maps.refreshAndClearUnsavedChangesWarning();
    });
  });
}
