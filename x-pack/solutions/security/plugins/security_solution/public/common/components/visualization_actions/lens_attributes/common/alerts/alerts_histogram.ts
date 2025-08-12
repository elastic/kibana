/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';
const layerId = `layer-id-${uuidv4()}`;
const columnCountOfRecords = `column-count-of-records-id-${uuidv4()}`;
const columnTopValues = `column-top-values-id-${uuidv4()}`;
const columnTimestamp = `column-timestamp-id-${uuidv4()}`;

export const getAlertsHistogramLensAttributes: GetLensAttributes = ({
  stackByField = 'kibana.alert.rule.name',
  extraOptions,
}) => {
  return {
    title: 'Alerts',
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
            accessors: [columnCountOfRecords],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: columnTimestamp,
            splitAccessor: columnTopValues,
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
      filters: extraOptions?.filters ? extraOptions.filters : [],
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
                [columnCountOfRecords]: {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: { emptyAsNull: true },
                },
                [columnTopValues]: {
                  label: `Top values of ${stackByField}`,
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 1000,
                    orderBy: {
                      type: 'column',
                      columnId: columnCountOfRecords,
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                    secondaryFields: [],
                  },
                },
              },
              columnOrder: [columnTopValues, columnTimestamp, columnCountOfRecords],
              incompleteColumns: {},
            },
          },
        },
      },
      internalReferences: [],
      adHocDataViews: {},
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerId}`,
      },
    ],
  };
};
