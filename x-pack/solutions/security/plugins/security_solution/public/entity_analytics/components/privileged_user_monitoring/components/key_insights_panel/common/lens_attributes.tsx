/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ESBoolQuery } from '../../../../../../../common/typed_json';

interface KeyInsightsPanelParams {
  title: string;
  label: string;
  esqlQuery: string;
  dataViewId: string;
  filterQuery: ESBoolQuery | undefined;
}

interface KeyInsightsPanelFormBasedParams {
  title: string;
  label: string;
  dataViewId: string;
  dataViewTitle: string;
  filters: Filter[];
}

export const createKeyInsightsPanelLensAttributes = ({
  title,
  label,
  esqlQuery,
  dataViewId,
  filterQuery,
}: KeyInsightsPanelParams): LensAttributes => {
  return {
    title,
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: 'layer1',
        layerType: 'data',
        metricAccessor: 'count',
      },
      query: {
        query: esqlQuery,
        language: 'esql',
      },
      filters: [{ query: filterQuery, meta: {} }],
      datasourceStates: {
        textBased: {
          layers: {
            layer1: {
              columns: [
                {
                  columnId: 'count',
                  fieldName: 'count',
                  label,
                  customLabel: true,
                  params: {
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                        compact: false,
                      },
                    },
                  },
                },
              ],
              query: {
                esql: esqlQuery,
              },
            },
          },
        },
      },
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
        },
      },
    },
    references: [],
  };
};

export const createKeyInsightsPanelFormBasedLensAttributes = ({
  title,
  label,
  dataViewId,
  dataViewTitle,
  filters,
}: KeyInsightsPanelFormBasedParams): LensAttributes => {
  const layerId = 'key-insights-privileged-users-layer';
  const countColumnId = 'key-insights-privileged-users-count';

  return {
    title,
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId,
        layerType: 'data',
        metricAccessor: countColumnId,
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters,
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                [countColumnId]: {
                  label,
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'user.name',
                  customLabel: true,
                },
              },
              columnOrder: [countColumnId],
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
          id: dataViewId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
          title: dataViewTitle,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: dataViewTitle,
        },
      },
    },
    references: [],
  };
};
