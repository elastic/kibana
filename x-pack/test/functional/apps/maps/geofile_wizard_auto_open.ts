/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('Auto open file upload wizard in maps app', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('maps', 'map/?openLayerWizard=uploadGeoFile', {
        useActualUrl: true,
      });
    });

    it('should upload form exist', async () => {
      const addLayerPanel = await testSubjects.exists('layerAddForm');
      expect(addLayerPanel).to.be(true);
    });
  });
}
