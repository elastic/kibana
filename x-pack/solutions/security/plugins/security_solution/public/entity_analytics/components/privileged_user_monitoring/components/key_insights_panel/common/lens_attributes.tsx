/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';

interface KeyInsightsPanelParams {
  title: string;
  label: string;
  esqlQuery: string;
  dataViewId?: string; // Optional data view override for ESQL queries
}

export const createKeyInsightsPanelLensAttributes = ({
  title,
  label,
  esqlQuery,
  dataViewId,
}: KeyInsightsPanelParams): LensAttributes => ({
  title,
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: 'layer1',
      layerType: 'data',
      metricAccessor: 'count',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {},
      },
      textBased: {
        layers: {
          layer1: {
            columns: [
              {
                columnId: 'count',
                fieldName: 'COUNT(*)',
                label,
                customLabel: true,
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                      compact: false,
                    },
                  },
                },
              },
            ],
            columnOrder: ['count'],
            query: {
              esql: esqlQuery,
            },
          },
        },
      },
    },
    adHocDataViews: {
      'ml-anomalies-dataview': {
        id: 'ml-anomalies-dataview',
        title: '.ml-anomalies-*',
        timeFieldName: '@timestamp',
        fields: {},
        allowNoIndex: false,
      },
    },
  },
  references: dataViewId
    ? [
        {
          id: dataViewId,
          name: 'textBasedDataView',
          type: 'index-pattern',
        },
      ]
    : [],
});
