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
  dataViewId?: string;
  dataViewTitle?: string;
  filterQuery: ESBoolQuery | undefined;
}

export const createKeyInsightsPanelLensAttributes = ({
  title,
  label,
  esqlQuery,
  dataViewId = 'default-dataview',
  dataViewTitle = 'logs-*',
  filterQuery,
}: KeyInsightsPanelParams): LensAttributes => {
  // Determine appropriate data view based on the query
  const isMLQuery = esqlQuery.includes('.ml-anomalies');
  const isAlertsQuery = esqlQuery.includes('.alerts-');

  let adHocDataView;
  if (isMLQuery) {
    adHocDataView = {
      'ml-anomalies-dataview': {
        id: 'ml-anomalies-dataview',
        title: '.ml-anomalies-*',
        timeFieldName: '@timestamp',
        allowNoIndex: true, // Allow queries even if ML indices don't exist
      },
    };
  } else if (isAlertsQuery) {
    adHocDataView = {
      'alerts-dataview': {
        id: 'alerts-dataview',
        title: '.alerts-*',
        timeFieldName: '@timestamp',
      },
    };
  } else {
    // Default for logs data
    adHocDataView = {
      'logs-dataview': {
        id: 'logs-dataview',
        title: dataViewTitle,
        timeFieldName: '@timestamp',
      },
    };
  }

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
      adHocDataViews: adHocDataView,
    },
    references: [],
  };
};
