/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

const VECTOR_SOURCE_ID = 'caffa63a-ebfb-466d-8ff6-d797975b88ab';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');

  describe('mvt geoshape layer', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'geoshape_data_reader'], false);
      await PageObjects.maps.loadSavedMap('geo_shape_mvt');
    });

    after(async () => {
      await inspector.close();
      await security.testUser.restoreDefaults();
    });

    it('should render with mvt-source', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

      //Source should be correct
      expect(
        mapboxStyle.sources[VECTOR_SOURCE_ID].tiles[0].startsWith(
          `/api/maps/mvt/getTile/{z}/{x}/{y}.pbf?geometryFieldName=geometry&index=geo_shapes*&requestBody=(_source:!(geometry),docvalue_fields:!(prop1),query:(bool:(filter:!(),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(),size:10001,stored_fields:!(geometry,prop1))&geoFieldType=geo_shape`
        )
      ).to.equal(true);

      //Should correctly load meta for style-rule (sigma is set to 1, opacity to 1)
      const fillLayer = mapboxStyle.layers.find((layer) => layer.id === VECTOR_SOURCE_ID + '_fill');
      expect(fillLayer.paint).to.eql({
        'fill-color': [
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['get', 'prop1'], null],
              0.3819660112501051,
              [
                'max',
                ['min', ['to-number', ['get', 'prop1']], 3.618033988749895],
                1.381966011250105,
              ],
            ],
            0.3819660112501051,
          ],
          0.3819660112501051,
          'rgba(0,0,0,0)',
          1.381966011250105,
          '#ecf1f7',
          1.6614745084375788,
          '#d9e3ef',
          1.9409830056250525,
          '#c5d5e7',
          2.2204915028125263,
          '#b2c7df',
          2.5,
          '#9eb9d8',
          2.7795084971874737,
          '#8bacd0',
          3.0590169943749475,
          '#769fc8',
          3.338525491562421,
          '#6092c0',
        ],
        'fill-opacity': 1,
      });
    });
  });
}
