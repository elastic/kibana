/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');
  const find = getService('find');

  describe('vector tile layer with joins', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'geoshape_data_reader', 'meta_for_geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
      await PageObjects.maps.loadSavedMap('mvt join example');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should show dynamic data range in legend', async () => {
      const layerTOCDetails = await PageObjects.maps.getLayerTOCDetails('geo_shapes*');
      const split = layerTOCDetails.trim().split('\n');

      // field display name
      expect(split[0]).to.equal('max prop1');

      // bands 1-8
      expect(split[1]).to.equal('< 4.13');
      expect(split[2]).to.equal('4.13 up to 5.25');
      expect(split[3]).to.equal('5.25 up to 6.38');
      expect(split[4]).to.equal('6.38 up to 7.5');
      expect(split[5]).to.equal('7.5 up to 8.63');
      expect(split[6]).to.equal('8.63 up to 9.75');
      expect(split[7]).to.equal('9.75 up to 11');
      expect(split[8]).to.equal('>= 11');
    });

    it('should show join metrics in tooltip', async () => {
      // zoom in on feature so tooltip click can not miss
      await PageObjects.maps.setView(-1, 60, 9);
      await PageObjects.maps.lockTooltipAtPosition(200, -200);

      const tooltipRows = await find.allByCssSelector(`tr[class='mapFeatureTooltip_row']`);
      expect(tooltipRows.length).to.equal(2);
      expect(await tooltipRows[0].getVisibleText()).to.equal('name charlie');
      expect(await tooltipRows[1].getVisibleText()).to.equal('max prop1 12');
    });

    describe('query bar', () => {
      before(async () => {
        await PageObjects.maps.setAndSubmitQuery('prop1 < 10');
      });

      after(async () => {
        await PageObjects.maps.setAndSubmitQuery('');
      });

      it('should update dynamic data range in legend', async () => {
        const layerTOCDetails = await PageObjects.maps.getLayerTOCDetails('geo_shapes*');
        const split = layerTOCDetails.trim().split('\n');

        // field display name
        expect(split[0]).to.equal('max prop1');

        // bands 1-8
        expect(split[1]).to.equal('< 3.63');
        expect(split[2]).to.equal('3.63 up to 4.25');
        expect(split[3]).to.equal('4.25 up to 4.88');
        expect(split[4]).to.equal('4.88 up to 5.5');
        expect(split[5]).to.equal('5.5 up to 6.13');
        expect(split[6]).to.equal('6.13 up to 6.75');
        expect(split[7]).to.equal('6.75 up to 7.38');
        expect(split[8]).to.equal('>= 7.38');
      });

      it('fit to bounds should exclude source features without join matches', async () => {
        await PageObjects.maps.clickFitToData();

        const { lat, lon, zoom } = await PageObjects.maps.getView();
        expect(Math.round(lat)).to.equal(0);
        expect(Math.round(lon)).to.equal(90);
        expect(Math.ceil(zoom)).to.equal(5);
      });
    });
  });
}
