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

const LAYER_ID = '320760EB-4185-43EB-985B-94B9240C57E7';

export const DEFAULT_PAGE_SIZE = 10;

export const getAlertsPreviewLensAttributes = ({
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
                columnId: '@timestamp',
                fieldName: '@timestamp',
                meta: {
                  type: 'date',
                  esType: 'date',
                },
              },
              {
                columnId: 'kibana.alert.risk_score',
                fieldName: 'Risk score',
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'host.name',
                fieldName: 'host.name',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
              {
                columnId: 'user.name',
                fieldName: 'user.name',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
            ],
            index: '31734563-1D31-4A8C-804A-CA17540A793E',
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
          width: 220,
        },
        {
          columnId: '@timestamp',
        },
        {
          columnId: 'kibana.alert.risk_score',
        },
        {
          columnId: 'host.name',
        },
        {
          columnId: 'user.name',
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
  title: i18n.ALERTS_PREVIEW,
  visualizationType: 'lnsDatatable',
});
