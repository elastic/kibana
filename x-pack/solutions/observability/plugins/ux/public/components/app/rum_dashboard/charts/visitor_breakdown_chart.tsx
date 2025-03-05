/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  CountIndexPatternColumn,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import {
  ATTR_PROCESSOR_EVENT,
  ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START,
  ATTR_TRANSACTION_TYPE,
  ATTR_URL_FULL,
  ATTR_USER_AGENT_NAME,
  ATTR_USER_AGENT_OS_NAME,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
import { EuiText } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { getEsFilter } from '../../../../services/data/get_es_filter';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import type { UxUIFilters } from '../../../../../typings/ui_filters';

const BUCKET_SIZE = 9;

export type VisitorBreakdownMetric = typeof ATTR_USER_AGENT_NAME | typeof ATTR_USER_AGENT_OS_NAME;

interface LensAttributes {
  metric: VisitorBreakdownMetric;
  uiFilters: UxUIFilters;
  urlQuery?: string;
  dataView: DataView;
}

type Props = {
  start: string;
  end: string;
  onFilter: (metric: VisitorBreakdownMetric, event: any) => void;
} & LensAttributes;

export function VisitorBreakdownChart({
  start,
  end,
  onFilter,
  uiFilters,
  urlQuery,
  metric,
  dataView,
}: Props) {
  const kibana = useKibanaServices();
  const LensEmbeddableComponent = kibana.lens.EmbeddableComponent;
  const [localDataViewId] = useState<string>(uuidv4());

  const lensAttributes = useMemo(
    () =>
      getVisitorBreakdownLensAttributes({
        uiFilters,
        urlQuery,
        metric,
        dataView,
        localDataViewId,
      }),
    [uiFilters, urlQuery, metric, dataView, localDataViewId]
  );

  const filterHandler = useCallback(
    (event: any) => {
      onFilter(metric, event);
    },
    [onFilter, metric]
  );

  if (!LensEmbeddableComponent) {
    return (
      <EuiText>
        {i18n.translate('xpack.ux.visitorBreakdownChart.noLensComponentTextLabel', {
          defaultMessage: 'No lens component',
        })}
      </EuiText>
    );
  }

  return (
    <LensEmbeddableComponent
      id={`ux-visitor-breakdown-${metric.replaceAll('.', '-')}`}
      hidePanelTitles
      withDefaultActions
      style={{ minHeight: '250px', height: '100%' }}
      attributes={lensAttributes}
      timeRange={{
        from: start ?? '',
        to: end ?? '',
      }}
      viewMode={'view'}
      onFilter={filterHandler}
    />
  );
}

const visConfig = {
  layers: [
    {
      layerId: 'layer1',
      primaryGroups: ['col1'],
      metrics: ['col2'],
      categoryDisplay: 'default',
      legendDisplay: 'hide',
      numberDisplay: 'percent',
      legendStats: ['value'],
      nestedLegend: false,
      layerType: 'data',
    },
  ],
  shape: 'pie',
};

export function getVisitorBreakdownLensAttributes({
  uiFilters,
  urlQuery,
  metric,
  dataView,
  localDataViewId,
}: LensAttributes & {
  localDataViewId: string;
}): TypedLensByValueInput['attributes'] {
  const localDataView = dataView.toSpec(false);
  localDataView.id = localDataViewId;

  const dataLayer: PersistedIndexPatternLayer = {
    incompleteColumns: {},
    columnOrder: ['col1', 'col2'],
    columns: {
      col1: {
        label: `Top ${BUCKET_SIZE} values of ${metric}`,
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: metric,
        isBucketed: true,
        params: {
          size: BUCKET_SIZE,
          orderBy: {
            type: 'column',
            columnId: 'col2',
          },
          orderDirection: 'desc',
          otherBucket: true,
          parentFormat: {
            id: 'terms',
          },
        },
      } as TermsIndexPatternColumn,
      col2: {
        label: 'Count of records',
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        params: {
          emptyAsNull: true,
        },
      } as CountIndexPatternColumn,
    },
  };

  return {
    visualizationType: 'lnsPie',
    title: `ux-visitor-breakdown-${metric}`,
    references: [],
    state: {
      internalReferences: [
        {
          id: localDataView.id,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: localDataView.id,
          name: 'indexpattern-datasource-layer-layer1',
          type: 'index-pattern',
        },
      ],
      adHocDataViews: {
        [localDataView.id]: localDataView,
      },
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        {
          meta: {},
          query: {
            bool: {
              filter: [
                { term: { [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_LOAD } },
                {
                  terms: {
                    [ATTR_PROCESSOR_EVENT]: [PROCESSOR_EVENT_VALUE_TRANSACTION],
                  },
                },
                {
                  exists: {
                    field: ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START,
                  },
                },
                ...getEsFilter(uiFilters),
                ...(urlQuery
                  ? [
                      {
                        wildcard: {
                          [ATTR_URL_FULL]: `*${urlQuery}*`,
                        },
                      },
                    ]
                  : []),
              ],
              must_not: [...getEsFilter(uiFilters, true)],
            },
          },
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: visConfig,
    },
  };
}
