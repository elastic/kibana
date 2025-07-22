/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { ExtraOptions, LensAttributes } from '../../types';

export type MyGetLensAttributes = (params: {
  stackByField?: string;
  euiTheme: EuiThemeComputed;
  extraOptions?: ExtraOptions;
  esql?: string;
  totalAlerts: number;
}) => LensAttributes;

export const getAlertFilteringTrendLensAttributes: MyGetLensAttributes = ({
  extraOptions,
  totalAlerts,
}) => {
  return {
    description: '',
    state: {
      adHocDataViews: {},
      datasourceStates: {
        formBased: {
          layers: {
            '3c03ff91-8a1b-4696-acd1-6f9c768ed1a3': {
              columnOrder: [
                'dfc3d179-e3d2-4aaa-b4c1-175caa164e34',
                'f66b5c37-c534-428d-994f-01ad5f59d981',
                'f66b5c37-c534-428d-994f-01ad5f59d981X0',
                'f66b5c37-c534-428d-994f-01ad5f59d981X1',
              ],
              columns: {
                'dfc3d179-e3d2-4aaa-b4c1-175caa164e34': {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
                  sourceField: '@timestamp',
                },
                'f66b5c37-c534-428d-994f-01ad5f59d981': {
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
                  references: ['f66b5c37-c534-428d-994f-01ad5f59d981X1'],
                },
                'f66b5c37-c534-428d-994f-01ad5f59d981X0': {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Part of Alert filtering rate',
                  operationType: 'count',
                  params: { emptyAsNull: false },
                  sourceField: '___records___',
                },
                'f66b5c37-c534-428d-994f-01ad5f59d981X1': {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Part of Alert filtering rate',
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: ['f66b5c37-c534-428d-994f-01ad5f59d981X0', totalAlerts],
                      location: { max: 12, min: 0 },
                      name: 'divide',
                      text: `count()/${totalAlerts}`,
                      type: 'function',
                    },
                  },
                  references: ['f66b5c37-c534-428d-994f-01ad5f59d981X0'],
                },
              },
              ignoreGlobalFilters: false,
              incompleteColumns: {},
              linkToLayers: ['unifiedHistogram'],
              sampling: 1,
            },
            unifiedHistogram: {
              columnOrder: ['count_column', 'count_columnX0', 'count_columnX1'],
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
                  references: ['count_columnX1'],
                },
                count_columnX0: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count()/${totalAlerts}`,
                  operationType: 'count',
                  params: { emptyAsNull: false },
                  sourceField: '___records___',
                },
                count_columnX1: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count()/${totalAlerts}`,
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: ['count_columnX0', totalAlerts],
                      location: { max: 12, min: 0 },
                      name: 'divide',
                      text: `count()/${totalAlerts}`,
                      type: 'function',
                    },
                  },
                  references: ['count_columnX0'],
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: extraOptions?.filters ?? [],
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
        trendlineLayerId: '3c03ff91-8a1b-4696-acd1-6f9c768ed1a3',
        trendlineLayerType: 'metricTrendline',
        trendlineMetricAccessor: 'f66b5c37-c534-428d-994f-01ad5f59d981',
        trendlineTimeAccessor: 'dfc3d179-e3d2-4aaa-b4c1-175caa164e34',
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
    version: 'WzI0LDFd',
  } as LensAttributes;
};
