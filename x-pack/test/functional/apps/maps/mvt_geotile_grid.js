/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

const MB_VECTOR_SOURCE_ID = 'g1xkv';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');

  describe('mvt geotile grid layer', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'test_logstash_reader', 'geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await inspector.close();
      await security.testUser.restoreDefaults();
    });

    it('should render with mvt-source (style meta from ES)', async () => {
      await PageObjects.maps.loadSavedMap('MVT geotile grid (style meta from ES)');
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

      const tileUrl = new URL(
        mapboxStyle.sources[MB_VECTOR_SOURCE_ID].tiles[0],
        'http://absolute_path'
      );
      const searchParams = Object.fromEntries(tileUrl.searchParams);

      expect(tileUrl.pathname).to.equal('/api/maps/mvt/getGridTile/%7Bz%7D/%7Bx%7D/%7By%7D.pbf');

      // token is an unique id that changes between runs
      expect(typeof searchParams.token).to.equal('string');
      delete searchParams.token;

      expect(searchParams).to.eql({
        geometryFieldName: 'geo.coordinates',
        index: 'logstash-*',
        gridPrecision: 8,
        requestType: 'grid',
        requestBody: `(_source:(excludes:!()),aggs:(max_of_bytes:(max:(field:bytes))),fields:!((field:'@timestamp',format:date_time),(field:'relatedContent.article:modified_time',format:date_time),(field:'relatedContent.article:published_time',format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((range:('@timestamp':(format:strict_date_optional_time,gte:'2015-09-20T00:00:00.000Z',lte:'2015-09-20T01:00:00.000Z')))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(hour_of_day:(script:(lang:painless,source:'doc[!'@timestamp!'].value.getHour()'))),size:0,stored_fields:!('*'))`,
      });

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
              ['==', ['get', 'max_of_bytes.value'], null],
              1622,
              ['max', ['min', ['to-number', ['get', 'max_of_bytes.value']], 9790], 1623],
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

    it('should render with mvt-source (style meta from local - count)', async () => {
      await PageObjects.maps.loadSavedMap('MVT geotile grid (style meta from local - count)');
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

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
              ['==', ['get', '_count'], null],
              0,
              ['max', ['min', ['to-number', ['get', '_count']], 8], 1],
            ],
            0,
          ],
          0,
          'rgba(0,0,0,0)',
          1,
          '#ecf1f7',
          1.875,
          '#d9e3ef',
          2.75,
          '#c5d5e7',
          3.625,
          '#b2c7df',
          4.5,
          '#9eb9d8',
          5.375,
          '#8bacd0',
          6.25,
          '#769fc8',
          7.125,
          '#6092c0',
        ],
        'fill-opacity': 0.75,
      });
    });

    it('should render with mvt-source (style meta from local - metric)', async () => {
      await PageObjects.maps.loadSavedMap('MVT geotile grid (style meta from local - metric)');
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

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
              ['==', ['get', 'sum_of_bytes.value'], null],
              -1,
              ['max', ['min', ['to-number', ['get', 'sum_of_bytes.value']], 14941], 0],
            ],
            -1,
          ],
          -1,
          'rgba(0,0,0,0)',
          0,
          '#ecf1f7',
          1867.625,
          '#d9e3ef',
          3735.25,
          '#c5d5e7',
          5602.875,
          '#b2c7df',
          7470.5,
          '#9eb9d8',
          9338.125,
          '#8bacd0',
          11205.75,
          '#769fc8',
          13073.375,
          '#6092c0',
        ],
        'fill-opacity': 0.75,
      });
    });

    it('should render heatmap layer', async () => {
      await PageObjects.maps.loadSavedMap('geo grid heatmap example');
      const mapboxStyle = await PageObjects.maps.getMapboxStyle();

      const heatmapLayer = mapboxStyle.layers.find((layer) => layer.id === '3xlvm_heatmap');

      expect(heatmapLayer.paint).to.eql({
        'heatmap-radius': 128,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(0, 0, 255, 0)',
          0.1,
          'rgb(65, 105, 225)',
          0.28,
          'rgb(0, 256, 256)',
          0.45999999999999996,
          'rgb(0, 256, 0)',
          0.64,
          'rgb(256, 256, 0)',
          0.82,
          'rgb(256, 0, 0)',
        ],
        'heatmap-opacity': 0.75,
        'heatmap-weight': ['/', ['get', '_count'], 1],
      });
    });
  });
}
