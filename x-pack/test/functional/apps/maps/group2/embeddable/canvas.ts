/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['canvas', 'common', 'maps']);
  const retry = getService('retry');

  describe('Map embeddable in canvas', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-c74f9c27-a142-4664-bf8a-69bf782fc268/page/1',
      });
    });

    it('should render map embeddable', async () => {
      await retry.try(async () => {
        const embeddableCount = await PageObjects.canvas.getEmbeddableCount();
        expect(embeddableCount).to.eql(1);
      });
      await PageObjects.maps.waitForLayersToLoad();
      expect(await PageObjects.maps.doesLayerExist('geo_shapes*')).to.equal(true);
    });

    it('should not show draw controls', async () => {
      await PageObjects.maps.expectMissingToolsControl();
    });
  });
}
