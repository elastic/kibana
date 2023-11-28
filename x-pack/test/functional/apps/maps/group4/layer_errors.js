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
      const LAYER_NAME = 'idThatDoesNotExitForESSearchSource';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('ESGeoGridSource with missing index pattern id', () => {
      const LAYER_NAME = 'idThatDoesNotExitForESGeoGridSource';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('ESJoinSource with missing index pattern id', () => {
      const LAYER_NAME = 'geo_shapes*';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('EMSFileSource with missing EMS id', () => {
      const LAYER_NAME = 'EMS_vector_shapes';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('EMSTMSSource with missing EMS id', () => {
      const LAYER_NAME = 'EMS_tiles';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('KibanaTilemapSource with missing map.tilemap.url configuration', () => {
      const LAYER_NAME = 'Custom_TMS';

      it('should diplay error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(exists).to.be(false);
      });
    });
  });
}
