/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';

import { isEmpty } from 'lodash';
import type { GetLensAttributes, LensEmbeddableDataTableColumn } from '../../../types';
import { COUNT_OF, TOP_VALUE } from '../../../translations';

const layerId = uuidv4();
const topValuesOfStackByFieldColumnId = uuidv4();
const countColumnId = uuidv4();
const topValuesOfBreakdownFieldColumnId = uuidv4();
const defaultColumns = [
  {
    columnId: topValuesOfStackByFieldColumnId,
    isTransposed: false,
    width: 362,
  },
  {
    columnId: countColumnId,
    isTransposed: false,
  },
];
const breakdownFieldColumns = [
  {
    columnId: topValuesOfBreakdownFieldColumnId,
    isTransposed: false,
  },
];
const defaultColumnOrder = [topValuesOfStackByFieldColumnId];
const getTopValuesOfBreakdownFieldColumnSettings = (
  breakdownField: string
): Record<string, LensEmbeddableDataTableColumn> => ({
  [topValuesOfBreakdownFieldColumnId]: {
    label: TOP_VALUE(breakdownField),
    dataType: 'string',
    operationType: 'terms',
    scale: 'ordinal',
    sourceField: breakdownField,
    isBucketed: true,
    params: {
      size: 1000,
      orderBy: {
        type: 'column',
        columnId: countColumnId,
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
});

export const getAlertsTableLensAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.rule.name',
  extraOptions
) => {
  const breakdownFieldProvided = !isEmpty(extraOptions?.breakdownField);
  const countField =
    extraOptions?.breakdownField && breakdownFieldProvided
      ? extraOptions?.breakdownField
      : stackByField;
  const columnOrder = breakdownFieldProvided
    ? [...defaultColumnOrder, topValuesOfBreakdownFieldColumnId, countColumnId]
    : [...defaultColumnOrder, countColumnId];

  const columnSettings: Record<string, LensEmbeddableDataTableColumn> = {
    [topValuesOfStackByFieldColumnId]: {
      label: TOP_VALUE(stackByField),
      dataType: 'string',
      operationType: 'terms',
      scale: 'ordinal',
      sourceField: stackByField,
      isBucketed: true,
      params: {
        size: 1000,
        orderBy: {
          type: 'column',
          columnId: countColumnId,
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
    [countColumnId]: {
      label: COUNT_OF(countField),
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: countField,
      params: {
        emptyAsNull: true,
      },
    },
    ...(extraOptions?.breakdownField && breakdownFieldProvided
      ? getTopValuesOfBreakdownFieldColumnSettings(extraOptions?.breakdownField)
      : {}),
  };

  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsDatatable',
    state: {
      visualization: {
        columns: breakdownFieldProvided
          ? [...defaultColumns, ...breakdownFieldColumns]
          : defaultColumns,
        layerId,
        layerType: 'data',
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
              columns: columnOrder.reduce<Record<string, LensEmbeddableDataTableColumn>>(
                (acc, colId) => {
                  if (colId && columnSettings[colId]) {
                    acc[colId] = columnSettings[colId];
                  }
                  return acc;
                },
                {}
              ),
              columnOrder,
              sampling: 1,
              incompleteColumns: {},
            },
          },
        },
        textBased: {
          layers: {},
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
