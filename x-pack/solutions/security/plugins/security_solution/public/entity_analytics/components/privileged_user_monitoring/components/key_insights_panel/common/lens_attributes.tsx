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
        metricAccessor: 'countId',
      },
      query: {
        esql: '', // empty, because filters are applied directly to the lens.EmbeddableComponent
      },
      filters: [], // empty, because filters are applied directly to the lens.EmbeddableComponent
      datasourceStates: {
        textBased: {
          layers: {
            layer1: {
              index: dataViewId,
              query: {
                esql: esqlQuery,
              },
              columns: [
                {
                  columnId: 'countId',
                  fieldName: 'count',
                  label,
                  customLabel: false,
                },
              ],
              timeField: '@timestamp',
            },
          },
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: dataViewId,
          name: `indexpattern-datasource-layer-layer1`,
        },
      ],
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
        },
      },
    },
    references: [],
  };
};
