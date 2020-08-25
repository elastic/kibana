/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');

  describe('vector styling', () => {
    before(async () => {
      await security.testUser.setRoles(['test_logstash_reader', 'global_maps_all']);
      await PageObjects.maps.loadSavedMap('document example');
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('categorical styling', () => {
      before(async () => {
        await PageObjects.maps.openLayerPanel('logstash');
      });

      it('should provide auto complete suggestions', async () => {
        await PageObjects.maps.setStyleByValue('fillColor', 'machine.os.raw');
        await PageObjects.maps.selectCustomColorRamp('fillColor');
        const suggestions = await PageObjects.maps.getCategorySuggestions();
        expect(suggestions.trim().split('\n').join()).to.equal('win 8,win xp,win 7,ios,osx');
      });
    });
  });
}
