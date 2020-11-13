/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

const MB_VECTOR_SOURCE_ID = 'g1xkv';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');

  describe('mvt grid layer', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'test_logstash_reader', 'geoshape_data_reader'],
        false
      );
      await PageObjects.maps.loadSavedMap('geo grid vector grid example (SUPER_FINE resolution)');
    });

    after(async () => {
      await inspector.close();
      await security.testUser.restoreDefaults();
    });

    it('should render with mvt-source', async () => {
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

      //Source should be correct
      expect(mapboxStyle.sources[MB_VECTOR_SOURCE_ID].tiles[0]).to.equal(
        "/api/maps/mvt/getGridTile?x={x}&y={y}&z={z}&geometryFieldName=geo.coordinates&index=logstash-*&requestBody=(_source:(excludes:!()),aggs:(gridSplit:(aggs:(gridCentroid:(geo_centroid:(field:geo.coordinates)),max_of_bytes:(max:(field:bytes))),geotile_grid:(bounds:!n,field:geo.coordinates,precision:!n,shard_size:65535,size:65535))),docvalue_fields:!((field:'@timestamp',format:date_time),(field:'relatedContent.article:modified_time',format:date_time),(field:'relatedContent.article:published_time',format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:('@timestamp':(format:strict_date_optional_time,gte:'2015-09-20T00:00:00.000Z',lte:'2015-09-20T01:00:00.000Z')))),must:!(),must_not:!(),should:!())),script_fields:(hour_of_day:(script:(lang:painless,source:'doc[!'@timestamp!'].value.getHour()'))),size:0,stored_fields:!('*'))&requestType=grid&geoFieldType=geo_point"
      );

      //Should correctly load meta for style-rule (sigma is set to 1, opacity to 1)
      const fillLayer = mapboxStyle.layers.find(
        (layer) => layer.id === MB_VECTOR_SOURCE_ID + '_fill'
      );

      expect(fillLayer.paint).to.eql({
        'fill-color': [
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['get', 'max_of_bytes'], null],
              1622,
              ['max', ['min', ['to-number', ['get', 'max_of_bytes']], 9790], 1623],
            ],
            1622,
          ],
          1622,
          'rgba(0,0,0,0)',
          1623,
          '#ecf1f7',
          2643.875,
          '#d9e3ef',
          3664.75,
          '#c5d5e7',
          4685.625,
          '#b2c7df',
          5706.5,
          '#9eb9d8',
          6727.375,
          '#8bacd0',
          7748.25,
          '#769fc8',
          8769.125,
          '#6092c0',
        ],
        'fill-opacity': 0.75,
      });
    });
  });
}
