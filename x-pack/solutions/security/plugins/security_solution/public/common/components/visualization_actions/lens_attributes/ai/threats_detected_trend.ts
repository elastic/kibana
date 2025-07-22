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
  extra?: React.JSX.Element;
}) => LensAttributes;
export const getThreatsDetectedTrendLensAttributes: MyGetLensAttributes = ({ extra }) => {
  return {
    description: '',
    state: {
      adHocDataViews: {
        '99d292f8-524f-4aad-9e37-81c17f8331fb': {
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {},
          fieldFormats: {},
          id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
          name: '.alerts-security.attack.discovery.alerts-*,.adhoc.alerts-security.attack.discovery.alerts-*',
          runtimeFieldMap: {},
          sourceFilters: [],
          timeFieldName: '@timestamp',
          title:
            '.alerts-security.attack.discovery.alerts-*,.adhoc.alerts-security.attack.discovery.alerts-*',
        },
      },
      datasourceStates: {
        formBased: {
          layers: {
            'c17b2286-3a97-4ce3-b27c-02343d0a5d51': {
              columnOrder: [
                '9649ca04-06d6-4bb5-a468-0e809cf96895',
                '960043d1-073e-4501-8b6b-8d46c682c939',
              ],
              columns: {
                '960043d1-073e-4501-8b6b-8d46c682c939': {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Real threats detected',
                  operationType: 'count',
                  params: { format: { id: 'number', params: { decimals: 0 } } },
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                '9649ca04-06d6-4bb5-a468-0e809cf96895': {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
                  sourceField: '@timestamp',
                },
              },
              ignoreGlobalFilters: false,
              incompleteColumns: {},
              linkToLayers: ['unifiedHistogram'],
              sampling: 1,
            },
            unifiedHistogram: {
              columnOrder: ['count_column'],
              columns: {
                count_column: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Real threats detected',
                  operationType: 'count',
                  params: { format: { id: 'number', params: { decimals: 0 } } },
                  scale: 'ratio',
                  sourceField: '___records___',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      internalReferences: [
        {
          id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
          name: 'indexpattern-datasource-layer-unifiedHistogram',
          type: 'index-pattern',
        },
        {
          id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
          name: 'indexpattern-datasource-layer-c17b2286-3a97-4ce3-b27c-02343d0a5d51',
          type: 'index-pattern',
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: {
        icon: 'crosshairs',
        iconAlign: 'right',
        valuesTextAlign: 'left',
        layerId: 'unifiedHistogram',
        layerType: 'data',
        metricAccessor: 'count_column',
        secondaryTrend: { type: 'none' },
        showBar: false,
        trendlineLayerId: 'c17b2286-3a97-4ce3-b27c-02343d0a5d51',
        trendlineLayerType: 'metricTrendline',
        trendlineMetricAccessor: '960043d1-073e-4501-8b6b-8d46c682c939',
        trendlineTimeAccessor: '9649ca04-06d6-4bb5-a468-0e809cf96895',
      },
    },
    title: 'Real threats detected',
    visualizationType: 'lnsMetric',
    references: [],
    type: 'lens',
    updated_at: '2025-07-21T15:51:38.660Z',
    version: 'WzI0LDFd',
  } as LensAttributes;
};
