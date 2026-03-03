/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertIndexFilter } from './helpers';
import type { ExtraOptions, LensAttributes } from '../../types';

const xColumn0 = 'cost_columnX0';
const xColumn1 = 'cost_columnX1';
const dateColumn = 'date_column';
const costColumn = 'cost_column';

export type MyGetLensAttributes = (params: {
  stackByField?: string;
  euiTheme: EuiThemeComputed;
  extraOptions?: ExtraOptions;
  esql?: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
  signalIndexName: string;
}) => LensAttributes;

export const getCostSavingsTrendAreaLensAttributes: MyGetLensAttributes = ({
  analystHourlyRate,
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
              columnOrder: [dateColumn, costColumn, xColumn0, xColumn1],
              columns: {
                [costColumn]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Cost Savings',
                  operationType: 'formula',
                  params: {
                    format: {
                      id: 'custom',
                      params: {
                        decimals: 0,
                        pattern: '$0,0.[000]',
                      },
                    },
                    formula: `count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
                    isFormulaBroken: false,
                  },
                  references: [xColumn1],
                },
                [xColumn0]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
                  operationType: 'count',
                  params: {
                    emptyAsNull: false,
                  },
                  sourceField: '___records___',
                },
                [xColumn1]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: [
                        xColumn0,
                        {
                          args: [
                            {
                              args: [minutesPerAlert, 60],
                              location: {
                                max: 16,
                                min: 12,
                              },
                              name: 'divide',
                              text: `${minutesPerAlert}/60`,
                              type: 'function',
                            },
                            analystHourlyRate,
                          ],
                          location: {
                            max: 20,
                            min: 11,
                          },
                          name: 'multiply',
                          text: `(${minutesPerAlert}/60)*${analystHourlyRate}`,
                          type: 'function',
                        },
                      ],
                      location: {
                        max: 21,
                        min: 0,
                      },
                      name: 'multiply',
                      text: `count() * ((${minutesPerAlert}/60)*${analystHourlyRate})`,
                      type: 'function',
                    },
                  },
                  references: [xColumn0],
                },
                [dateColumn]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: {
                    interval: 'auto',
                  },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [getAlertIndexFilter(signalIndexName), ...(extraOptions?.filters ?? [])],
      internalReferences: [],
      query: {
        language: 'kuery',
        query: '',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
        },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: false,
        },
        layers: [
          {
            accessors: [costColumn],
            layerId: 'unifiedHistogram',
            layerType: 'data',
            seriesType: 'line',
            xAccessor: dateColumn,
            yConfig: [
              {
                forAccessor: costColumn,
              },
            ],
          },
        ],
        legend: {
          isVisible: true,
          legendSize: 'xlarge',
          position: 'right',
          shouldTruncate: false,
        },
        minBarHeight: 2,
        preferredSeriesType: 'line',
        showCurrentTimeMarker: true,
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: false,
        },
        valueLabels: 'hide',
      },
    },
    title: 'Cost Savings Trend',
    visualizationType: 'lnsXY',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
    ],
  } as LensAttributes;
};
