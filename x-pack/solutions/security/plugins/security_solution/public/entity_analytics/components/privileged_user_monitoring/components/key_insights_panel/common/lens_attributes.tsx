/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ESBoolQuery } from '../../../../../../../common/typed_json';

interface KeyInsightsPanelParams {
  title: string;
  label: string;
  esqlQuery: string;
  dataViewId: string;
  filterQuery: ESBoolQuery | undefined;
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
                  fieldName: 'COUNT(*)',
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
