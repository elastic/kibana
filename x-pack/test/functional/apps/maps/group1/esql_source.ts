/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');

  describe('esql', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'test_logstash_reader'], {
        skipBrowserRefresh: true,
      });
      await PageObjects.maps.loadSavedMap('esql example');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should display ES|QL statement results on map', async () => {
      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('logstash-*');
      expect(tooltipText).to.equal(
        'logstash-*\nFound 5 rows.\nResults narrowed by global time\nResults narrowed by visible map area'
      );
    });
  });
}
