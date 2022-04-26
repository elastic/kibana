/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'maps']);
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Auto open file upload wizard in maps app', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('integrations', 'browse', {
        useActualUrl: true,
      });
      const geoFileCard = await find.byCssSelector(
        '[data-test-subj="integration-card:ui_link:ingest_geojson"]'
      );
      geoFileCard.click();
    });

    it('should navigate to maps app with url params', async () => {
      const currentUrl = await browser.getCurrentUrl();
      expect(currentUrl).contain('openLayerWizard=uploadGeoFile');
    });

    it('should upload form exist', async () => {
      await retry.waitFor(
        `Add layer panel to be visible`,
        async () => await PageObjects.maps.isLayerAddPanelOpen()
      );
    });
  });
}
