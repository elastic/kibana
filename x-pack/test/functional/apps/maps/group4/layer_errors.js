/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps', 'header']);
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const kibanaServer = getService('kibanaServer');

  describe('layer errors', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        'courier:ignoreFilterIfFieldNotInIndex': false,
      });
      await PageObjects.maps.loadSavedMap('layer with errors');
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
    });

    describe('Layer with invalid descriptor', () => {
      const INVALID_LAYER_NAME = 'fff76ebb-57a6-4067-a373-1d191b9bd1a3';

      it('should display error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail(INVALID_LAYER_NAME);
      });

      it('should allow deletion of layer', async () => {
        await PageObjects.maps.removeLayer(INVALID_LAYER_NAME);
        const exists = await PageObjects.maps.doesLayerExist(INVALID_LAYER_NAME);
        expect(exists).to.be(false);
      });
    });

    describe('Layer with EsError', () => {
      after(async () => {
        await inspector.close();
      });

      it('should display error icon in legend', async () => {
        await PageObjects.maps.hasErrorIconExistsOrFail('connections');
      });

      it('should display "View details" button', async () => {
        await testSubjects.existOrFail('viewEsErrorButton');
      });

      it('should open request in inspector', async () => {
        await testSubjects.click('viewEsErrorButton');

        expect(await comboBox.getComboBoxSelectedOptions('inspectorRequestChooser')).to.eql([
          'load layer features (connections)',
        ]);
      });
    });

    describe('ESSearchSource with missing index pattern id', () => {
      const LAYER_NAME = 'idThatDoesNotExitForESSearchSource';

      it('should display error icon in legend', async () => {
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

      it('should display error icon in legend', async () => {
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

      it('should display error icon in legend', async () => {
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

      it('should display error icon in legend', async () => {
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

      it('should display error icon in legend', async () => {
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

      it('should display error icon in legend', async () => {
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
