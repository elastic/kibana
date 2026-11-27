/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockLayerList = [
  {
    joins: [
      {
        leftField: 'iso2',
        right: {
          applyForceRefresh: true,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          type: 'ES_TERM_SOURCE',
          id: '3657625d-17b0-41ef-99ba-3a2b2938655c',
          term: 'client.geo.country_iso_code',
          whereQuery: {
            language: 'kuery',
            query: 'transaction.type : "page-load" and service.name : "undefined"',
          },
          metrics: [
            {
              type: 'avg',
              field: 'transaction.duration.us',
              label: 'Page load duration',
            },
          ],
          indexPatternId: 'apm_static_data_view_id_default',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'world_countries',
      tooltipProperties: ['name'],
    },
    style: {
      type: 'VECTOR',
      properties: {
        icon: { type: 'STATIC', options: { value: 'marker' } },
        fill_color: {
          type: 'DYNAMIC',
          options: {
            color: 'Blue to Red',
            color_category: 'palette_0',
            field_meta_options: { is_enabled: true, sigma: 3 },
            type: 'ORDINAL',
            field: {
              name: '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c',
              origin: 'join',
            },
            use_custom_color_ramp: false,
          },
        },
        line_color: {
          type: 'DYNAMIC',
          options: { color: '#3d3d3d', field_meta_options: { is_enabled: true } },
        },
        line_width: { type: 'STATIC', options: { size: 1 } },
        icon_size: { type: 'STATIC', options: { size: 6 } },
        icon_orientation: { type: 'STATIC', options: { orientation: 0 } },
        label_text: { type: 'STATIC', options: { value: '' } },
        label_color: { type: 'STATIC', options: { color: '#000000' } },
        label_position: { options: { position: 'CENTER' } },
        label_size: { type: 'STATIC', options: { size: 14 } },
        label_border_color: { type: 'STATIC', options: { color: '#FFFFFF' } },
        label_zoom_range: {
          options: { max_zoom: 24, min_zoom: 0, use_layer_zoom_range: true },
        },
        symbolize_as: { options: { value: 'circle' } },
        label_border_size: { options: { size: 'SMALL' } },
      },
      is_time_aware: true,
    },
    id: 'e8d1d974-eed8-462f-be2c-f0004b7619b2',
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'GEOJSON_VECTOR',
  },
  {
    joins: [
      {
        leftField: 'region_iso_code',
        right: {
          applyForceRefresh: true,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          type: 'ES_TERM_SOURCE',
          id: 'e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
          term: 'client.geo.region_iso_code',
          whereQuery: {
            language: 'kuery',
            query: 'transaction.type : "page-load" and service.name : "undefined"',
          },
          metrics: [{ type: 'avg', field: 'transaction.duration.us' }],
          indexPatternId: 'apm_static_data_view_id_default',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'administrative_regions_lvl2',
      tooltipProperties: ['region_iso_code', 'region_name'],
    },
    style: {
      type: 'VECTOR',
      properties: {
        icon: { type: 'STATIC', options: { value: 'marker' } },
        fill_color: {
          type: 'DYNAMIC',
          options: {
            color: 'Blue to Red',
            color_category: 'palette_0',
            field_meta_options: { is_enabled: true, sigma: 3 },
            type: 'ORDINAL',
            field: {
              name: '__kbnjoin__avg_of_transaction.duration.us__e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
              origin: 'join',
            },
            use_custom_color_ramp: false,
          },
        },
        line_color: {
          type: 'DYNAMIC',
          options: { color: '#3d3d3d', field_meta_options: { is_enabled: true } },
        },
        line_width: { type: 'STATIC', options: { size: 1 } },
        icon_size: { type: 'STATIC', options: { size: 6 } },
        icon_orientation: { type: 'STATIC', options: { orientation: 0 } },
        label_text: { type: 'STATIC', options: { value: '' } },
        label_color: { type: 'STATIC', options: { color: '#000000' } },
        label_position: { options: { position: 'CENTER' } },
        label_size: { type: 'STATIC', options: { size: 14 } },
        label_border_color: { type: 'STATIC', options: { color: '#FFFFFF' } },
        label_zoom_range: {
          options: { max_zoom: 24, min_zoom: 0, use_layer_zoom_range: true },
        },
        symbolize_as: { options: { value: 'circle' } },
        label_border_size: { options: { size: 'SMALL' } },
      },
      is_time_aware: true,
    },
    id: '0e936d41-8765-41c9-97f0-05e166391366',
    minZoom: 3,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'GEOJSON_VECTOR',
  },
];
