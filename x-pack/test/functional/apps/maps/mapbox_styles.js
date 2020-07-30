/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MAPBOX_STYLES = {
  POINT_LAYER: {
    id: 'n1t6f_circle',
    type: 'circle',
    source: 'n1t6f',
    minzoom: 0,
    maxzoom: 24,
    filter: [
      'all',
      ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
      ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],
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
              ['feature-state', '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1'],
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
        '#ecf1f7',
        4.125,
        '#d9e3ef',
        5.25,
        '#c5d5e7',
        6.375,
        '#b2c7df',
        7.5,
        '#9eb9d8',
        8.625,
        '#8bacd0',
        9.75,
        '#769fc8',
        10.875,
        '#6092c0',
      ],
      'circle-opacity': 0.75,
      'circle-stroke-color': '#41937c',
      'circle-stroke-opacity': 0.75,
      'circle-stroke-width': 1,
      'circle-radius': 10,
    },
  },
  FILL_LAYER: {
    id: 'n1t6f_fill',
    type: 'fill',
    source: 'n1t6f',
    minzoom: 0,
    maxzoom: 24,
    filter: [
      'all',
      ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
      ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
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
              ['feature-state', '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1'],
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
        '#ecf1f7',
        4.125,
        '#d9e3ef',
        5.25,
        '#c5d5e7',
        6.375,
        '#b2c7df',
        7.5,
        '#9eb9d8',
        8.625,
        '#8bacd0',
        9.75,
        '#769fc8',
        10.875,
        '#6092c0',
      ],
      'fill-opacity': 0.75,
    },
  },
  LINE_LAYER: {
    id: 'n1t6f_line',
    type: 'line',
    source: 'n1t6f',
    minzoom: 0,
    maxzoom: 24,
    filter: [
      'all',
      ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
      [
        'any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon'],
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString'],
      ],
    ],
    layout: {
      visibility: 'visible',
    },
    paint: {
      /* 'line-color': '' */ // Obtained dynamically
      'line-opacity': 0.75,
      'line-width': 1,
    },
  },
};
