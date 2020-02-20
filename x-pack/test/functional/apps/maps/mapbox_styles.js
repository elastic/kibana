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
    layout: {
      visibility: 'visible',
    },
    paint: {
      'circle-color': [
        'interpolate',
        ['linear'],
        [
          'coalesce',
          [
            'feature-state',
            '__kbn__dynamic____kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name__fillColor',
          ],
          -1,
        ],
        -1,
        'rgba(0,0,0,0)',
        0,
        '#f7faff',
        0.125,
        '#ddeaf7',
        0.25,
        '#c5daee',
        0.375,
        '#9dc9e0',
        0.5,
        '#6aadd5',
        0.625,
        '#4191c5',
        0.75,
        '#2070b4',
        0.875,
        '#072f6b',
      ],
      'circle-opacity': 0.75, // Obtained dynamically
      /* 'circle-stroke-color': '' */ 'circle-stroke-opacity': 0.75,
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
    layout: {
      visibility: 'visible',
    },
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        [
          'coalesce',
          [
            'feature-state',
            '__kbn__dynamic____kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name__fillColor',
          ],
          -1,
        ],
        -1,
        'rgba(0,0,0,0)',
        0,
        '#f7faff',
        0.125,
        '#ddeaf7',
        0.25,
        '#c5daee',
        0.375,
        '#9dc9e0',
        0.5,
        '#6aadd5',
        0.625,
        '#4191c5',
        0.75,
        '#2070b4',
        0.875,
        '#072f6b',
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
