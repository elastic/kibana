/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  CountIndexPatternColumn,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { EuiText } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { OTEL_BROWSER_NAME, OTEL_BROWSER_OS } from '../../../../../common/otel_rum';
import { getEsFilter } from '../../../../services/data/get_es_filter';
import {
  rumPageLoadFilter,
  rumUrlWildcardFilter,
} from '../../../../services/data/rum_otel_filters';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import type { UxUIFilters } from '../../../../../typings/ui_filters';

const BUCKET_SIZE = 9;

export enum VisitorBreakdownMetric {
  OS_BREAKDOWN = 'ux.visitor.os',
  UA_BREAKDOWN = 'ux.visitor.browser',
}

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

const VISITOR_BROWSER_SCRIPT = `
if (doc.containsKey('user_agent.name') && doc['user_agent.name'].size() != 0) {
  emit(doc['user_agent.name'].value);
} else if (doc.containsKey('${OTEL_BROWSER_NAME}') && doc['${OTEL_BROWSER_NAME}'].size() != 0) {
  emit(doc['${OTEL_BROWSER_NAME}'].value);
}
`.trim();

const VISITOR_OS_SCRIPT = `
if (doc.containsKey('user_agent.os.name') && doc['user_agent.os.name'].size() != 0) {
  emit(doc['user_agent.os.name'].value);
} else if (doc.containsKey('${OTEL_BROWSER_OS}') && doc['${OTEL_BROWSER_OS}'].size() != 0) {
  emit(doc['${OTEL_BROWSER_OS}'].value);
}
`.trim();

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
  localDataView.runtimeFieldMap = {
    ...localDataView.runtimeFieldMap,
    [VisitorBreakdownMetric.UA_BREAKDOWN]: {
      type: 'keyword',
      script: { source: VISITOR_BROWSER_SCRIPT },
    },
    [VisitorBreakdownMetric.OS_BREAKDOWN]: {
      type: 'keyword',
      script: { source: VISITOR_OS_SCRIPT },
    },
  };

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
                rumPageLoadFilter(),
                ...getEsFilter(uiFilters),
                ...(urlQuery ? [rumUrlWildcardFilter(urlQuery)] : []),
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
