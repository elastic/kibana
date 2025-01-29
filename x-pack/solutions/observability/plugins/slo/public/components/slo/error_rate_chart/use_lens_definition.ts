/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import { getLensDefinitionInterval } from './utils';

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface AlertAnnotation {
  date: Date;
  total: number;
}

interface Props {
  slo: SLOWithSummaryResponse;
  threshold?: number;
  dataTimeRange: TimeRange;
  alertTimeRange?: TimeRange;
  annotations?: AlertAnnotation[];
  variant: 'success' | 'danger';
}

export function useLensDefinition({
  slo,
  threshold,
  dataTimeRange,
  alertTimeRange,
  annotations,
  variant,
}: Props): TypedLensByValueInput['attributes'] {
  const { euiTheme } = useEuiTheme();

  const lineColor = variant === 'danger' ? euiTheme.colors.danger : euiTheme.colors.success;

  const interval = getLensDefinitionInterval(dataTimeRange, slo);

  return {
    title: 'SLO Error Rate',
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [],
    state: {
      visualization: {
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: false,
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        preferredSeriesType: 'area',
        layers: [
          {
            layerId: '8730e8af-7dac-430e-9cef-3b9989ff0866',
            accessors: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14'],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '627ded04-eae0-4437-83a1-bbb6138d2c3b',
            yConfig: [
              {
                forAccessor: '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14',
                color: lineColor,
              },
            ],
          },
          ...(threshold !== undefined
            ? [
                {
                  layerId: '34298f84-681e-4fa3-8107-d6facb32ed92',
                  layerType: 'referenceLine',
                  accessors: ['0a42b72b-cd5a-4d59-81ec-847d97c268e6'],
                  yConfig: [
                    {
                      forAccessor: '0a42b72b-cd5a-4d59-81ec-847d97c268e6',
                      axisMode: 'left',
                      textVisibility: true,
                      color: euiTheme.colors.danger,
                      iconPosition: 'right',
                    },
                  ],
                },
              ]
            : []),
          ...(!!alertTimeRange
            ? [
                {
                  layerId: uuidv4(),
                  layerType: 'annotations',
                  annotations: [
                    {
                      type: 'manual',
                      id: uuidv4(),
                      label: i18n.translate('xpack.slo.errorRateChart.alertLabel', {
                        defaultMessage: 'Alert',
                      }),
                      key: {
                        type: 'point_in_time',
                        timestamp: moment(alertTimeRange.from).toISOString(),
                      },
                      lineWidth: 2,
                      color: euiTheme.colors.danger,
                      icon: 'alert',
                    },
                    {
                      type: 'manual',
                      label: i18n.translate('xpack.slo.errorRateChart.activeAlertLabel', {
                        defaultMessage: 'Active alert',
                      }),
                      key: {
                        type: 'range',
                        timestamp: moment(alertTimeRange.from).toISOString(),
                        endTimestamp: moment(alertTimeRange.to).toISOString(),
                      },
                      id: uuidv4(),
                      color: transparentize(euiTheme.colors.danger, 0.2),
                    },
                  ],
                  ignoreGlobalFilters: true,
                  persistanceType: 'byValue',
                },
              ]
            : []),
          ...(!!annotations && annotations.length > 0
            ? annotations.map((annotation) => ({
                layerId: uuidv4(),
                layerType: 'annotations',
                annotations: [
                  {
                    type: 'manual',
                    id: uuidv4(),
                    label: i18n.translate('xpack.slo.errorRateChart.alertAnnotationLabel', {
                      defaultMessage: '{total} alert',
                      values: { total: annotation.total },
                    }),
                    key: {
                      type: 'point_in_time',
                      timestamp: moment(annotation.date).toISOString(),
                    },
                    lineWidth: 2,
                    color: euiTheme.colors.danger,
                    icon: 'alert',
                  },
                ],
                ignoreGlobalFilters: true,
                persistanceType: 'byValue',
              }))
            : []),
        ],
      },
      query: {
        query: `slo.id : "${slo.id}" and slo.instanceId : "${slo.instanceId ?? ALL_VALUE}"`,
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            '8730e8af-7dac-430e-9cef-3b9989ff0866': {
              columns: {
                '627ded04-eae0-4437-83a1-bbb6138d2c3b': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    // @ts-ignore
                    interval,
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                ...(slo.budgetingMethod === 'occurrences' && {
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.numerator',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.denominator',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      tinymathAst: {
                        type: 'function',
                        name: 'subtract',
                        args: [
                          1,
                          {
                            type: 'function',
                            name: 'divide',
                            args: [
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                            ],
                            location: {
                              min: 3,
                              max: 47,
                            },
                            text: '(sum(slo.numerator) / sum(slo.denominator))',
                          },
                        ],
                        location: {
                          min: 0,
                          max: 47,
                        },
                        text: '1 - (sum(slo.numerator) / sum(slo.denominator))',
                      },
                    },
                    references: [
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                    ],
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14': {
                    label: i18n.translate('xpack.slo.errorRateChart.errorRateLabel', {
                      defaultMessage: 'Error rate',
                    }),
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      formula: '1 - (sum(slo.numerator) / sum(slo.denominator))',
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 2,
                        },
                      },
                    },
                    references: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2'],
                    customLabel: true,
                  },
                }),
                ...(slo.budgetingMethod === 'timeslices' && {
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.isGoodSlice',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'count',
                    sourceField: 'slo.isGoodSlice',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      tinymathAst: {
                        type: 'function',
                        name: 'subtract',
                        args: [
                          1,
                          {
                            type: 'function',
                            name: 'divide',
                            args: [
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                            ],
                            location: {
                              min: 3,
                              max: 47,
                            },
                            text: '(sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                          },
                        ],
                        location: {
                          min: 0,
                          max: 47,
                        },
                        text: '1 - (sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                      },
                    },
                    references: [
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                    ],
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14': {
                    label: i18n.translate('xpack.slo.errorRateChart.errorRateLabel', {
                      defaultMessage: 'Error rate',
                    }),
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      formula: '1 - (sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 2,
                        },
                      },
                    },
                    references: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2'],
                    customLabel: true,
                  },
                }),
              },
              columnOrder: [
                '627ded04-eae0-4437-83a1-bbb6138d2c3b',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2',
              ],
              incompleteColumns: {},
              sampling: 1,
            },

            ...(threshold !== undefined && {
              '34298f84-681e-4fa3-8107-d6facb32ed92': {
                linkToLayers: [],
                columns: {
                  '0a42b72b-cd5a-4d59-81ec-847d97c268e6X0': {
                    label: `Part of ${threshold}x`,
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      tinymathAst: {
                        type: 'function',
                        name: 'multiply',
                        args: [
                          {
                            type: 'function',
                            name: 'subtract',
                            args: [1, slo.objective.target],
                            location: {
                              min: 1,
                              max: 9,
                            },
                            text: `1 - ${slo.objective.target}`,
                          },
                          threshold,
                        ],
                        location: {
                          min: 0,
                          max: 17,
                        },
                        text: `(1 - ${slo.objective.target}) * ${threshold}`,
                      },
                    },
                    references: [],
                    customLabel: true,
                  },
                  '0a42b72b-cd5a-4d59-81ec-847d97c268e6': {
                    label: `${numeral(threshold).format('0.[00]')}x`,
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      formula: `(1 - ${slo.objective.target}) * ${threshold}`,
                      isFormulaBroken: false,
                    },
                    references: ['0a42b72b-cd5a-4d59-81ec-847d97c268e6X0'],
                    customLabel: true,
                  },
                },
                columnOrder: [
                  '0a42b72b-cd5a-4d59-81ec-847d97c268e6',
                  '0a42b72b-cd5a-4d59-81ec-847d97c268e6X0',
                ],
                sampling: 1,
                ignoreGlobalFilters: false,
                incompleteColumns: {},
              },
            }),
          },
        },
        indexpattern: {
          layers: {},
        },
        textBased: {
          layers: {},
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          name: 'indexpattern-datasource-layer-8730e8af-7dac-430e-9cef-3b9989ff0866',
        },
        {
          type: 'index-pattern',
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          name: 'indexpattern-datasource-layer-34298f84-681e-4fa3-8107-d6facb32ed92',
        },
      ],
      adHocDataViews: {
        '32ca1ad4-81c0-4daf-b9d1-07118044bdc5': {
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          title: !!slo.remote
            ? `${slo.remote.remoteName}:${SLI_DESTINATION_INDEX_PATTERN}`
            : SLI_DESTINATION_INDEX_PATTERN,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: 'SLO Rollup Data',
        },
      },
    },
  };
}
