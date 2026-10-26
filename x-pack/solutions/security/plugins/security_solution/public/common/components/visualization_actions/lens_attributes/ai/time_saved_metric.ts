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
  minutesPerAlert: number;
  signalIndexName: string;
}) => LensAttributes;

export const getTimeSavedMetricLensAttributes: MyGetLensAttributes = ({
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
              columnOrder: ['count_column', 'countColumnX0', 'countColumnX1'],
              columns: {
                count_column: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Analyst time saved',
                  operationType: 'formula',
                  params: {
                    format: { id: 'number', params: { decimals: 0 } },
                    formula: `(count()*${minutesPerAlert}/60)`,
                    isFormulaBroken: false,
                  },
                  references: ['countColumnX1'],
                },
                countColumnX0: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of (count()*${minutesPerAlert}/60)`,
                  operationType: 'count',
                  params: { emptyAsNull: false },
                  sourceField: '___records___',
                },
                countColumnX1: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: `Part of (count()*${minutesPerAlert}/60)`,
                  operationType: 'math',
                  params: {
                    tinymathAst: {
                      args: [
                        {
                          args: ['countColumnX0', minutesPerAlert],
                          name: 'multiply',
                          type: 'function',
                        },
                        60,
                      ],
                      location: { max: 14, min: 0 },
                      name: 'divide',
                      text: `(count()*${minutesPerAlert}/60)`,
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
      query: { language: 'kuery', query: '_id:*' },
      visualization: {
        icon: 'clock',
        iconAlign: 'right',
        valuesTextAlign: 'left',
        layerId: 'unifiedHistogram',
        layerType: 'data',
        metricAccessor: 'count_column',
        secondaryTrend: { type: 'none' },
        showBar: false,
      },
    },
    title: 'Analyst time saved',
    visualizationType: 'lnsMetric',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-25539c1e-d5aa-4069-8c0c-de2c69bdd532',
        type: 'index-pattern',
      },
    ],
  } as LensAttributes;
};
