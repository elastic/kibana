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
  minutesPerAlert: number;
  analystHourlyRate: number;
}) => LensAttributes;

export const getCostSavingsMetricLensAttributes: MyGetLensAttributes = ({
  analystHourlyRate,
  extraOptions,
  minutesPerAlert,
}) => {
  return {
    description: '',
    state: {
      adHocDataViews: {},
      datasourceStates: {
        formBased: {
          layers: {
            unifiedHistogram: {
              columnOrder: ['countColumn', 'countColumnX0', 'countColumnX1'],
              columns: {
                countColumn: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Cost Savings',
                  operationType: 'formula',
                  params: {
                    format: { id: 'custom', params: { decimals: 0, pattern: '$0,0.[000]' } },
                    formula: `count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
                    isFormulaBroken: false,
                  },
                  references: ['countColumnX1'],
                },
                countColumnX0: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Part of Cost Savings',
                  operationType: 'count',
                  params: { emptyAsNull: false },
                  sourceField: '___records___',
                },
                countColumnX1: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Part of Cost Savings',
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: [
                        'countColumnX0',
                        {
                          args: [
                            {
                              args: [8, 60],
                              location: { max: 16, min: 12 },
                              name: 'divide',
                              text: '8/60',
                              type: 'function',
                            },
                            75,
                          ],
                          location: { max: 20, min: 11 },
                          name: 'multiply',
                          text: '(8/60)*75',
                          type: 'function',
                        },
                      ],
                      location: { max: 21, min: 0 },
                      name: 'multiply',
                      text: `count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
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
      filters: extraOptions?.filters ?? [],
      internalReferences: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        color: 'e8f9f3',
        icon: 'launch',
        iconAlign: 'right',
        valuesTextAlign: 'left',
        layerId: 'unifiedHistogram',
        layerType: 'data',
        metricAccessor: 'countColumn',
        secondaryTrend: { type: 'none' },
      },
    },
    title: 'Cost Savings Metric',
    visualizationType: 'lnsMetric',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2025-07-21T15:51:38.660Z',
    version: 'WzI0LDFd',
  } as LensAttributes;
};
