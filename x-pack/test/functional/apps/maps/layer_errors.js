/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['maps', 'header']);

  describe('layer errors', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('layer with errors');
    });

    describe('ESSearchSource with missing index pattern id', () => {
      const MISSING_INDEX_ID = 'idThatDoesNotExitForESSearchSource';
      const LAYER_NAME = MISSING_INDEX_ID;

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(`Unable to find data view \'${MISSING_INDEX_ID}\'`);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    //TODO, skipped because `ESGeoGridSource` show no results icon instead of error icon.

    describe.skip('ESGeoGridSource with missing index pattern id', () => {
      const MISSING_INDEX_ID = 'idThatDoesNotExitForESGeoGridSource';
      const LAYER_NAME = MISSING_INDEX_ID;

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(`Unable to find Index pattern for id: ${MISSING_INDEX_ID}`);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('ESJoinSource with missing index pattern id', () => {
      const MISSING_INDEX_ID = 'idThatDoesNotExitForESJoinSource';
      const LAYER_NAME = 'geo_shapes*';

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(`Join error: Unable to find data view \'${MISSING_INDEX_ID}\'`);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('EMSFileSource with missing EMS id', () => {
      const MISSING_EMS_ID = 'idThatDoesNotExitForEMSFileSource';
      const LAYER_NAME = 'EMS_vector_shapes';

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(
          `Unable to find EMS vector shapes for id: ${MISSING_EMS_ID}. Kibana is unable to access Elastic Maps Service. Contact your system administrator.`
        );
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('EMSTMSSource with missing EMS id', () => {
      const MISSING_EMS_ID = 'idThatDoesNotExitForEMSTile';
      const LAYER_NAME = 'EMS_tiles';

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(
          `Unable to find EMS tile configuration for id: ${MISSING_EMS_ID}. Kibana is unable to access Elastic Maps Service. Contact your system administrator.`
        );
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('KibanaTilemapSource with missing map.tilemap.url configuration', () => {
      const LAYER_NAME = 'Custom_TMS';

      it('should diplay error message in layer panel', async () => {
        const errorMsg = await PageObjects.maps.getLayerErrorText(LAYER_NAME);
        expect(errorMsg).to.equal(`Unable to find map.tilemap.url configuration in the kibana.yml`);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });
  });
}
