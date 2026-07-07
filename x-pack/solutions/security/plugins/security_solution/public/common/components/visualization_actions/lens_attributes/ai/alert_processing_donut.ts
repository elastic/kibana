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
  attackAlertIds: string[];
  spaceId: string;
}) => LensAttributes;
export const getAlertProcessingDonutAttributes: MyGetLensAttributes = ({
  attackAlertIds,
  spaceId,
}) => {
  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsPie',
    state: {
      visualization: {
        layers: [
          {
            categoryDisplay: 'show',
            colorMapping: {
              assignments: [
                {
                  color: {
                    colorIndex: 0,
                    paletteId: 'default',
                    type: 'categorical',
                  },
                  rules: [
                    {
                      type: 'raw',
                      value: 'AI Filtered',
                    },
                  ],
                  touched: false,
                },
                {
                  color: {
                    colorIndex: 9,
                    paletteId: 'default',
                    type: 'categorical',
                  },
                  rules: [
                    {
                      type: 'raw',
                      value: 'Escalated',
                    },
                  ],
                  touched: false,
                },
              ],
              colorMode: {
                type: 'categorical',
              },
              paletteId: 'default',
              specialAssignments: [
                {
                  color: {
                    type: 'loop',
                  },
                  rules: [
                    {
                      type: 'other',
                    },
                  ],
                  touched: false,
                },
              ],
            },
            emptySizeRatio: 0.9,
            layerId: 'unifiedHistogram',
            layerType: 'data',
            legendSize: 'medium',
            legendPosition: 'right',
            legendDisplay: 'hide',
            legendStats: ['percent'],
            metrics: ['count_column'],
            nestedLegend: true,
            numberDisplay: 'percent',
            primaryGroups: ['breakdown_column'],
          },
        ],
        shape: 'donut',
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            unifiedHistogram: {
              columnOrder: ['breakdown_column', 'count_column'],
              columns: {
                breakdown_column: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Alert processing category',
                  operationType: 'terms',
                  params: {
                    missingBucket: true,
                    orderBy: {
                      columnId: 'count_column',
                      type: 'column',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    parentFormat: {
                      id: 'terms',
                    },
                    size: 3,
                  },
                  scale: 'ordinal',
                  sourceField: 'processing_analytics_rtf',
                },
                count_column: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  params: {
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                      },
                    },
                  },
                  scale: 'ratio',
                  sourceField: '___records___',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      internalReferences: [
        {
          id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
          name: 'indexpattern-datasource-layer-unifiedHistogram',
          type: 'index-pattern',
        },
      ],
      adHocDataViews: {
        'db828b69-bb21-4b92-bc33-56e3b01da790': {
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {
            processing_analytics_rtf: {},
          },
          fieldFormats: {},
          id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
          name: `.alerts-security.alerts-${spaceId}`,
          runtimeFieldMap: {
            processing_analytics_rtf: {
              script: {
                source: `
        if (${JSON.stringify(attackAlertIds)}.contains(doc['kibana.alert.uuid'].value)) {
          emit("Escalated");
        } else {
          emit("AI Filtered");
        }
      `,
              },
              type: 'keyword',
            },
          },
          sourceFilters: [],
          timeFieldName: '@timestamp',
          title: `.alerts-security.alerts-${spaceId}`,
        },
      },
    },
    references: [],
  };
};
