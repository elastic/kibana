/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../types';

const LAYER_ID = '416b6fad-1923-4f6a-a2df-b223bb287e30';
const COLUMN_ID = 'b00c65ea-32be-4163-bfc8-f795b1ef9d06';
const DATA_VIEW_ID = 'entity-store-host-data-view';

export const getKpiHostMetricLensAttributes = (spaceId?: string): LensAttributes => {
  const namespace = spaceId || 'default';
  const entityStoreIndexPattern = `.entities.v1.latest.security_host_${namespace}`;

  return {
    description: '',
    state: {
      adHocDataViews: {
        [DATA_VIEW_ID]: {
          id: DATA_VIEW_ID,
          title: entityStoreIndexPattern,
          timeFieldName: '@timestamp',
        },
      },
      datasourceStates: {
        formBased: {
          layers: {
            [LAYER_ID]: {
              columnOrder: [COLUMN_ID],
              columns: {
                [COLUMN_ID]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: ' ',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'entity.id',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        accessor: COLUMN_ID,
        layerId: LAYER_ID,
        layerType: 'data',
      },
    },
    title: '[Host] Hosts - metric',
    visualizationType: 'lnsLegacyMetric',
    references: [
      {
        id: DATA_VIEW_ID,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: DATA_VIEW_ID,
        name: `indexpattern-datasource-layer-${LAYER_ID}`,
        type: 'index-pattern',
      },
    ],
  } as LensAttributes;
};

// Keep the old export for backward compatibility, but it will use default space
export const kpiHostMetricLensAttributes = getKpiHostMetricLensAttributes();
