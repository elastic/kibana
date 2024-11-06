/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { canvas, maps } = getPageObjects(['canvas', 'maps']);
  const retry = getService('retry');

  describe('Map embeddable in canvas', () => {
    before(async () => {
      await canvas.goToListingPage();
      await canvas.loadFirstWorkpad('Canvas with map');
    });

    it('should render map embeddable', async () => {
      await retry.try(async () => {
        const embeddableCount = await canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(1);
      });
      await maps.waitForLayersToLoad();
      expect(await maps.doesLayerExist('geo_shapes*')).to.equal(true);
    });

    it('should not show draw controls', async () => {
      await maps.expectMissingToolsControl();
    });
  });
}
