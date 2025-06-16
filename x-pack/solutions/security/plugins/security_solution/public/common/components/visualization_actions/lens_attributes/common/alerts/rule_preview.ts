/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';

const layerId = `layer-id-${uuidv4()}`;
const internalReferenceId = `internal-reference-id-${uuidv4()}`;
const columnCountOfRecords = `column-count-of-records-id-${uuidv4()}`;
const columnTimestamp = `column-timestamp-id-${uuidv4()}`;
const columnTopValues = `column-top-values-id-${uuidv4()}`;

export const getRulePreviewLensAttributes: GetLensAttributes = ({
  stackByField = 'event.category',
  extraOptions,
}) => {
  return {
    title: 'Rule preview',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: extraOptions?.showLegend,
          position: 'right',
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
        yTitle: '',
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
            disabled: false,
            negate: false,
            alias: null,
            index: internalReferenceId,
            key: 'kibana.alert.rule.uuid',
            field: 'kibana.alert.rule.uuid',
            params: {
              query: extraOptions?.ruleId,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'kibana.alert.rule.uuid': extraOptions?.ruleId,
            },
          },
        },
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                [columnCountOfRecords]: {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: true,
                  },
                },
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
                    dropPartials: false,
                  },
                },
                [columnTopValues]: {
                  label: `Top 10 values of ${stackByField}`,
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 10,
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
                    include: [],
                    exclude: [],
                    includeIsRegex: false,
                    excludeIsRegex: false,
                  },
                },
              },
              columnOrder: [columnTopValues, columnTimestamp, columnCountOfRecords],
              sampling: 1,
              incompleteColumns: {},
            },
          },
        },
        textBased: {
          layers: {},
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: `.preview.alerts-security.alerts-${extraOptions?.spaceId}`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `.preview.alerts-security.alerts-${extraOptions?.spaceId}`,
        },
      },
    },
    references: [],
  };
};
