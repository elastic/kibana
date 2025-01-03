/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, maps } = getPageObjects(['common', 'maps']);
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');

  // FLAKY: https://github.com/elastic/kibana/issues/173095
  // Failing: See https://github.com/elastic/kibana/issues/173095
  describe.skip('Auto open file upload wizard in maps app', () => {
    before(async () => {
      await common.navigateToUrl('integrations', 'browse', {
        useActualUrl: true,
      });
      const searchInput = await find.byCssSelector('[data-test-subj="epmList.searchBar"]');
      await searchInput.type('GeoJSON');
      const geoFileCard = await find.byCssSelector(
        '[data-test-subj="integration-card:ui_link:ingest_geojson"]'
      );
      await geoFileCard.click();
    });

    it('should navigate to maps app with url params', async () => {
      const currentUrl = await browser.getCurrentUrl();
      expect(currentUrl).contain('openLayerWizard=uploadGeoFile');
    });

    it('should upload form exist', async () => {
      await retry.waitFor(
        `Add layer panel to be visible`,
        async () => await maps.isLayerAddPanelOpen()
      );
    });
  });
}
