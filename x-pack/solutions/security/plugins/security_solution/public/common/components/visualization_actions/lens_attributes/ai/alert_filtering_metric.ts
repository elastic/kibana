/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertIndexFilter } from './helpers';
import type { ExtraOptions, LensAttributes } from '../../types';

export type MyGetLensAttributes = (params: {
  stackByField?: string;
  euiTheme: EuiThemeComputed;
  extraOptions?: ExtraOptions;
  esql?: string;
  signalIndexName: string;
  totalAlerts: number;
}) => LensAttributes;

export const getAlertFilteringMetricLensAttributes: MyGetLensAttributes = ({
  extraOptions,
  signalIndexName,
  totalAlerts,
}) => {
  return {
    description: '',
    state: {
      adHocDataViews: {},
      datasourceStates: {
        formBased: {
          layers: {
            unifiedHistogram: {
              columnOrder: ['count_column', 'countColumnX0', 'countColumnX1'],
              columns: {
                count_column: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Alert filtering rate',
                  operationType: 'formula',
                  params: {
                    format: { id: 'percent', params: { decimals: 2 } },
                    formula: `count()/${totalAlerts}`,
                    isFormulaBroken: false,
                  },
                  references: ['countColumnX1'],
                },
                countColumnX0: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count()/${totalAlerts}`,
                  operationType: 'count',
                  params: { emptyAsNull: false },
                  sourceField: '___records___',
                },
                countColumnX1: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count()/${totalAlerts}`,
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: ['countColumnX0', totalAlerts],
                      location: { max: 12, min: 0 },
                      name: 'divide',
                      text: `count()/${totalAlerts}`,
                      type: 'function',
                    },
                  },
                  references: ['countColumnX0'],
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [getAlertIndexFilter(signalIndexName), ...(extraOptions?.filters ?? [])],
      internalReferences: [],
      query: { language: 'kuery', query: '_id :*' },
      visualization: {
        icon: 'visLine',
        iconAlign: 'right',
        valuesTextAlign: 'left',
        layerId: 'unifiedHistogram',
        layerType: 'data',
        metricAccessor: 'count_column',
        secondaryTrend: { type: 'none' },
        showBar: false,
      },
    },
    title: 'Alert filtering rate',
    visualizationType: 'lnsMetric',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-3c03ff91-8a1b-4696-acd1-6f9c768ed1a3',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2025-07-21T15:51:38.660Z',
  } as LensAttributes;
};
