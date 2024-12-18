/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const { maps } = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const security = getService('security');

  describe('mapbox styles', () => {
    let mapboxStyle;
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'geoshape_data_reader', 'meta_for_geoshape_data_reader'],
        { skipBrowserRefresh: true }
      );
      await maps.loadSavedMap('join example');
      mapboxStyle = await maps.getMapboxStyle();
    });

    after(async () => {
      await inspector.close();
      await security.testUser.restoreDefaults();
    });

    it('should style circle layer as expected', async () => {
      const layer = mapboxStyle.layers.find((mbLayer) => {
        return mbLayer.id === 'n1t6f_circle';
      });
      expect(layer).to.eql({
        id: 'n1t6f_circle',
        type: 'circle',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          ['!=', ['get', '__kbn_is_centroid_feature__'], true],
          ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: {
          'circle-color': [
            'interpolate',
            ['linear'],
            [
              'coalesce',
              [
                'case',
                [
                  '==',
                  [
                    'feature-state',
                    '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                  ],
                  null,
                ],
                2,
                [
                  'max',
                  [
                    'min',
                    [
                      'to-number',
                      [
                        'feature-state',
                        '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                      ],
                    ],
                    12,
                  ],
                  3,
                ],
              ],
              2,
            ],
            2,
            'rgba(0,0,0,0)',
            3,
            '#d5e8ff',
            4.125,
            '#c5ddff',
            5.25,
            '#b5d3ff',
            6.375,
            '#a4c8ff',
            7.5,
            '#93bdff',
            8.625,
            '#81b2ff',
            9.75,
            '#6ea8ff',
            10.875,
            '#599dff',
          ],
          'circle-opacity': 0.75,
          'circle-stroke-color': '#008b87',
          'circle-stroke-opacity': 0.75,
          'circle-stroke-width': 1,
          'circle-radius': 10,
        },
      });
    });

    it('should style fill layer as expected', async () => {
      const layer = mapboxStyle.layers.find((mbLayer) => {
        return mbLayer.id === 'n1t6f_fill';
      });
      expect(layer).to.eql({
        id: 'n1t6f_fill',
        type: 'fill',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            [
              'coalesce',
              [
                'case',
                [
                  '==',
                  [
                    'feature-state',
                    '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                  ],
                  null,
                ],
                2,
                [
                  'max',
                  [
                    'min',
                    [
                      'to-number',
                      [
                        'feature-state',
                        '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                      ],
                    ],
                    12,
                  ],
                  3,
                ],
              ],
              2,
            ],
            2,
            'rgba(0,0,0,0)',
            3,
            '#d5e8ff',
            4.125,
            '#c5ddff',
            5.25,
            '#b5d3ff',
            6.375,
            '#a4c8ff',
            7.5,
            '#93bdff',
            8.625,
            '#81b2ff',
            9.75,
            '#6ea8ff',
            10.875,
            '#599dff',
          ],
          'fill-opacity': 0.75,
        },
      });
    });

    it('should style fill layer as expected again', async () => {
      const layer = mapboxStyle.layers.find((mbLayer) => {
        return mbLayer.id === 'n1t6f_line';
      });
      expect(layer).to.eql({
        id: 'n1t6f_line',
        type: 'line',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          [
            'any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
            ['==', ['geometry-type'], 'LineString'],
            ['==', ['geometry-type'], 'MultiLineString'],
          ],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: { 'line-color': '#008b87', 'line-opacity': 0.75, 'line-width': 1 },
      });
    });
  });
}
