/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternMapping } from '../types';
import type { IndexPatternSavedObject } from '../../../../../common/hooks/types';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import type { EuiThemeComputed } from '@elastic/eui';

export const mockIndexPatternIds: IndexPatternMapping[] = [
  { title: 'filebeat-*', id: '8c7323ac-97ad-4b53-ac0a-40f8f691a918' },
];

export const mockAPMIndexPatternIds: IndexPatternMapping[] = [
  { title: 'apm-*', id: '8c7323ac-97ad-4b53-ac0a-40f8f691a918' },
  { title: 'traces-apm*,logs-apm*,metrics-apm*,apm-*', id: '8c7323ac-97ad-4b53-ac0a-40f8f691a918' },
];

export const mockLayerGroup = {
  id: 'uuidv4()',
  label: 'filebeat-*',
  sourceDescriptor: null,
  type: LAYER_TYPE.LAYER_GROUP,
  visible: true,
};

export const mockSourceLayer = {
  sourceDescriptor: {
    id: 'uuidv4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'source.geo.location',
    filterByMapBounds: false,
    tooltipProperties: [
      'host.name',
      'source.ip',
      'source.domain',
      'source.geo.country_iso_code',
      'source.as.organization.name',
    ],
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: 'euiColorVis4' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: 'euiColorVisNeutral0' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'home' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `filebeat-* | Source Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
  joins: [],
};

export const mockDestinationLayer = {
  sourceDescriptor: {
    id: 'uuidv4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'destination.geo.location',
    filterByMapBounds: true,
    tooltipProperties: [
      'host.name',
      'destination.ip',
      'destination.domain',
      'destination.geo.country_iso_code',
      'destination.as.organization.name',
    ],
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
    scalingType: 'LIMIT',
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: 'euiColorVis2' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: 'euiColorVisNeutral0' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'marker' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `filebeat-* | Destination Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
};

export const mockClientLayer = {
  sourceDescriptor: {
    id: 'uuidv4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'client.geo.location',
    filterByMapBounds: false,
    tooltipProperties: [
      'host.name',
      'client.ip',
      'client.domain',
      'client.geo.country_iso_code',
      'client.as.organization.name',
    ],
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: 'euiColorVis4' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: 'euiColorVisNeutral0' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'home' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `apm-* | Client Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
  joins: [],
};

const mockApmDataStreamClientLayer = {
  ...mockClientLayer,
  label: 'traces-apm*,logs-apm*,metrics-apm*,apm-* | Client Point',
};

export const mockServerLayer = {
  sourceDescriptor: {
    id: 'uuidv4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'server.geo.location',
    filterByMapBounds: true,
    tooltipProperties: [
      'host.name',
      'server.ip',
      'server.domain',
      'server.geo.country_iso_code',
      'server.as.organization.name',
    ],
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
    scalingType: 'LIMIT',
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: 'euiColorVis2' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: 'euiColorVisNeutral0' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'marker' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `apm-* | Server Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
};

const mockApmDataStreamServerLayer = {
  ...mockServerLayer,
  label: 'traces-apm*,logs-apm*,metrics-apm*,apm-* | Server Point',
};

export const mockLineLayer = {
  sourceDescriptor: {
    type: 'ES_PEW_PEW',
    applyGlobalQuery: true,
    id: 'uuidv4()',
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
    sourceGeoField: 'source.geo.location',
    destGeoField: 'destination.geo.location',
    metrics: [
      { type: 'sum', field: 'source.bytes', label: 'source.bytes' },
      { type: 'sum', field: 'destination.bytes', label: 'destination.bytes' },
    ],
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: '#A6EDEA' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: '#A6EDEA' },
      },
      lineWidth: {
        type: 'DYNAMIC',
        options: {
          field: {
            label: 'count',
            name: 'doc_count',
            origin: 'source',
          },
          minSize: 1,
          maxSize: 8,
          fieldMetaOptions: {
            isEnabled: true,
            sigma: 3,
          },
        },
      },
      iconSize: { type: 'STATIC', options: { size: 10 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'airfield' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `filebeat-* | Line`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.5,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
};

export const mockClientServerLineLayer = {
  sourceDescriptor: {
    type: 'ES_PEW_PEW',
    applyGlobalQuery: true,
    id: 'uuidv4()',
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
    sourceGeoField: 'client.geo.location',
    destGeoField: 'server.geo.location',
    metrics: [
      { type: 'sum', field: 'client.bytes', label: 'client.bytes' },
      { type: 'sum', field: 'server.bytes', label: 'server.bytes' },
    ],
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: '#A6EDEA' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: '#A6EDEA' },
      },
      lineWidth: {
        type: 'DYNAMIC',
        options: {
          field: {
            label: 'count',
            name: 'doc_count',
            origin: 'source',
          },
          minSize: 1,
          maxSize: 8,
          fieldMetaOptions: {
            isEnabled: true,
            sigma: 3,
          },
        },
      },
      iconSize: { type: 'STATIC', options: { size: 10 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbolizeAs: {
        options: { value: 'icon' },
      },
      icon: {
        type: 'STATIC',
        options: { value: 'airfield' },
      },
    },
  },
  id: 'uuidv4()',
  parent: 'uuidv4()',
  label: `apm-* | Line`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.5,
  visible: true,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  query: { query: '', language: 'kuery' },
};
const mockApmDataStreamClientServerLineLayer = {
  ...mockClientServerLineLayer,
  label: 'traces-apm*,logs-apm*,metrics-apm*,apm-* | Line',
};

export const mockLayerList = [mockLineLayer, mockDestinationLayer, mockSourceLayer, mockLayerGroup];

export const mockLayerListDouble = [
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
  mockLayerGroup,
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
  mockLayerGroup,
];

export const mockLayerListMixed = [
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
  mockLayerGroup,
  mockClientServerLineLayer,
  mockServerLayer,
  mockClientLayer,
  {
    ...mockLayerGroup,
    label: 'apm-*',
  },
  mockApmDataStreamClientServerLineLayer,
  mockApmDataStreamServerLayer,
  mockApmDataStreamClientLayer,
  {
    ...mockLayerGroup,
    label: 'traces-apm*,logs-apm*,metrics-apm*,apm-*',
  },
];

export const mockAPMIndexPattern: IndexPatternSavedObject = {
  id: 'apm-*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'apm-*',
  },
};

export const mockAPMRegexIndexPattern: IndexPatternSavedObject = {
  id: 'apm-7.*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'apm-7.*',
  },
};

export const mockFilebeatIndexPattern: IndexPatternSavedObject = {
  id: 'filebeat-*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'filebeat-*',
  },
};

export const mockAuditbeatIndexPattern: IndexPatternSavedObject = {
  id: 'auditbeat-*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'auditbeat-*',
  },
};

export const mockAPMTransactionIndexPattern: IndexPatternSavedObject = {
  id: 'apm-*-transaction*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'apm-*-transaction*',
  },
};

export const mockAPMTracesDataStreamIndexPattern: IndexPatternSavedObject = {
  id: 'traces-apm*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'traces-apm*',
  },
};

export const mockGlobIndexPattern: IndexPatternSavedObject = {
  id: '*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: '*',
  },
};

export const mockCCSGlobIndexPattern: IndexPatternSavedObject = {
  id: '*:*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: '*:*',
  },
};

export const mockCommaFilebeatAuditbeatGlobIndexPattern: IndexPatternSavedObject = {
  id: 'filebeat-*,auditbeat-*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'filebeat-*,auditbeat-*',
  },
};

export const mockCommaFilebeatAuditbeatCCSGlobIndexPattern: IndexPatternSavedObject = {
  id: '*:filebeat-*,*:auditbeat-*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: '*:filebeat-*,*:auditbeat-*',
  },
};

export const mockCommaFilebeatExclusionGlobIndexPattern: IndexPatternSavedObject = {
  id: 'filebeat-*,-filebeat-7.6.0*',
  type: 'index-pattern',
  _version: 'abc',
  attributes: {
    title: 'filebeat-*,-filebeat-7.6.0*',
  },
};

export const mockEuiTheme: EuiThemeComputed<{}> = {
  colors: {
    vis: {
      euiColorVisNeutral0: 'euiColorVisNeutral0',
      euiColorVis4: 'euiColorVis4',
      euiColorVis2: 'euiColorVis2',
    },
  },
} as unknown as EuiThemeComputed<{}>;
