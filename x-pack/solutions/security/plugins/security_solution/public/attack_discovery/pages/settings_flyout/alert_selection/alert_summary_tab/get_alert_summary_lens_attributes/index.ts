/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../../../../../common/components/visualization_actions/types';
import { getFirstColumnName } from '../../helpers/get_first_column_name';
import * as i18n from '../../translations';
import type { Sorting } from '../../types';

const LAYER_ID = '094d6c10-a28a-4780-8a0c-5789b73e4cef';

export const DEFAULT_PAGE_SIZE = 5;

export const getAlertSummaryLensAttributes = ({
  defaultPageSize = DEFAULT_PAGE_SIZE,
  esqlQuery,
  sorting,
  tableStackBy0,
}: {
  defaultPageSize?: number;
  esqlQuery: string;
  sorting?: Sorting;
  tableStackBy0: string;
}): LensAttributes => ({
  references: [],
  state: {
    adHocDataViews: {},
    datasourceStates: {
      textBased: {
        layers: {
          [LAYER_ID]: {
            columns: [
              {
                columnId: 'tableStackBy0',
                fieldName: getFirstColumnName(tableStackBy0),
              },
              {
                columnId: 'count',
                fieldName: 'Count',
                inMetricDimension: true,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
              },
            ],
            index: 'F2772070-4F12-4603-A318-82F98BA69DAB',
            query: {
              esql: esqlQuery,
            },
            timeField: '@timestamp',
          },
        },
      },
    },
    filters: [], // empty, because filters are applied directly to the lens.EmbeddableComponent
    query: {
      language: 'kuery',
      query: '', // empty, because the query from the query bar is applied directly to the lens.EmbeddableComponent
    },
    visualization: {
      columns: [
        {
          columnId: 'tableStackBy0',
          width: 300,
        },
        {
          columnId: 'count',
          summaryRow: 'sum',
        },
      ],
      layerId: LAYER_ID,
      layerType: 'data',
      paging: {
        enabled: true,
        size: defaultPageSize,
      },
      sorting: {
        ...sorting,
      },
    },
  },
  title: i18n.ALERTS_SUMMARY,
  visualizationType: 'lnsDatatable',
});
