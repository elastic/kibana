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
  backgroundColor: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
  signalIndexName: string;
}) => LensAttributes;

export const getCostSavingsMetricLensAttributes: MyGetLensAttributes = ({
  analystHourlyRate,
  backgroundColor,
  extraOptions,
  minutesPerAlert,
  signalIndexName,
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
                    format: { id: 'custom', params: { decimals: 0, pattern: '$0,0' } },
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
                              args: [minutesPerAlert, 60],
                              location: { max: 16, min: 12 },
                              name: 'divide',
                              text: `${minutesPerAlert}/60`,
                              type: 'function',
                            },
                            analystHourlyRate,
                          ],
                          location: { max: 20, min: 11 },
                          name: 'multiply',
                          text: `(${minutesPerAlert}/60)*${analystHourlyRate}`,
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
      filters: [getAlertIndexFilter(signalIndexName), ...(extraOptions?.filters ?? [])],
      internalReferences: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        color: backgroundColor,
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
  } as LensAttributes;
};
