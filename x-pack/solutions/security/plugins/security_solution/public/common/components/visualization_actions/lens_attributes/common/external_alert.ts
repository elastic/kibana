/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';

import { COUNT, TOP_VALUE } from '../../translations';
import type { GetLensAttributes, LensAttributes } from '../../types';

const layerId = `layer-id-${uuidv4()}`;
const columnTimestamp = `column-timestamp-id-${uuidv4()}`;
const columnCount = `column-count-id-${uuidv4()}`;
const columnTopValue = `column-top-value-id-${uuidv4()}`;

export const getExternalAlertLensAttributes: GetLensAttributes = ({
  stackByField = 'event.module',
}) => {
  return {
    title: 'External alerts',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'xlarge',
          legendStats: ['currentAndLastValue'],
        },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId,
            accessors: [columnCount],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: columnTimestamp,
            splitAccessors: [columnTopValue],
          },
        ],
        yRightExtent: {
          mode: 'full',
        },
        yLeftExtent: {
          mode: 'full',
        },
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [
        {
          meta: {
            index: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'event.kind',
            params: {
              query: 'alert',
            },
          },
          query: {
            match_phrase: {
              'event.kind': 'alert',
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                [columnTimestamp]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                  },
                },
                [columnCount]: {
                  label: COUNT,
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: { emptyAsNull: true },
                },
                [columnTopValue]: {
                  label: TOP_VALUE(`${stackByField}`),
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: `${stackByField}`,
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: columnCount,
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                  },
                },
              },
              columnOrder: [columnTopValue, columnTimestamp, columnCount],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerId}`,
      },
      {
        type: 'index-pattern',
        name: '723c4653-681b-4105-956e-abef287bf025',
        id: '{dataViewId}',
      },
      {
        type: 'index-pattern',
        name: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
        id: '{dataViewId}',
      },
    ],
  } as unknown as LensAttributes;
};
