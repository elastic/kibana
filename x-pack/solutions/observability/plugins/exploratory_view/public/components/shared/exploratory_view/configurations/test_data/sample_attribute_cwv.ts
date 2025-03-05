/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ATTR_PROCESSOR_EVENT,
  ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_TYPE,
  ATTR_USER_AGENT_OS_NAME,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
} from '@kbn/observability-ui-semantic-conventions';
import { mockDataView } from '../../rtl_helpers';
import { RECORDS_FIELD } from '../constants';

export const sampleAttributeCoreWebVital = {
  description: '',
  references: [],
  state: {
    internalReferences: [
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
    ],
    adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
    datasourceStates: {
      formBased: {
        layers: {
          layer0: {
            columnOrder: [
              'x-axis-column-layer0',
              'y-axis-column-layer0-0',
              'y-axis-column-1',
              'y-axis-column-2',
            ],
            columns: {
              'x-axis-column-layer0': {
                dataType: 'string',
                isBucketed: true,
                label: 'Operating system',
                operationType: 'terms',
                params: {
                  missingBucket: false,
                  orderBy: {
                    columnId: 'y-axis-column-layer0-0',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  size: 10,
                },
                scale: 'ordinal',
                sourceField: ATTR_USER_AGENT_OS_NAME,
              },
              'y-axis-column-1': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: `${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} > 2500 and ${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} < 4000'`,
                },
                isBucketed: false,
                label: 'Average',
                operationType: 'count',
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
              },
              'y-axis-column-2': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: '${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} > 4000',
                },
                isBucketed: false,
                label: 'Poor',
                operationType: 'count',
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
              },
              'y-axis-column-layer0-0': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: `${ATTR_TRANSACTION_TYPE}: (page-load or page-exit) and ${ATTR_PROCESSOR_EVENT}: ${PROCESSOR_EVENT_VALUE_TRANSACTION} and ${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} < 2500`,
                },
                isBucketed: false,
                label: 'Good',
                operationType: 'count',
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    filters: [],
    query: {
      language: 'kuery',
      query:
        '${ATTR_TRANSACTION_TYPE}: (page-load or page-exit) and ${ATTR_PROCESSOR_EVENT}: ${PROCESSOR_EVENT_VALUE_TRANSACTION} and ${ATTR_TRANSACTION_TYPE}: ("page-load" or "page-exit")',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: true,
        yRight: true,
      },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['y-axis-column-layer0-0', 'y-axis-column-1', 'y-axis-column-2'],
          layerId: 'layer0',
          layerType: 'data',
          palette: undefined,
          seriesType: 'bar_horizontal_percentage_stacked',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: '#24c292',
              forAccessor: 'y-axis-column',
            },
            {
              color: '#fcd883',
              forAccessor: 'y-axis-column-1',
            },
            {
              color: '#f6726a',
              forAccessor: 'y-axis-column-2',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        showSingleSeries: true,
        position: 'right',
        shouldTruncate: false,
        legendSize: 'auto',
      },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
    },
  },
  title: 'Prefilled from exploratory view app',
  visualizationType: 'lnsXY',
};
