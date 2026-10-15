/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { HttpStart } from '@kbn/core/public';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useParams } from 'react-router-dom';
import { pick } from 'lodash/fp';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useCapabilities, useKibana } from '../../../common/lib/kibana';
import { DashboardViewPromptState } from '../../hooks/use_dashboard_view_prompt_state';
import { DashboardRenderer } from '../../components/dashboard_renderer';
import { StatusPrompt } from '../../components/status_prompt';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { DashboardToolBar } from '../../components/dashboard_tool_bar';
import { useDashboardRenderer } from '../../hooks/use_dashboard_renderer';
import { useDashboardTitle } from '../../hooks/use_dashboard_title';

const dashboardViewFlexGroupStyle = { minHeight: `calc(100vh - 140px)` };

const collectEsqlQueries = (value: unknown, queries: string[], seen: Set<object>): void => {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectEsqlQueries(item, queries, seen);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.esql === 'string') {
    queries.push(record.esql);
  }
  for (const child of Object.values(record)) {
    collectEsqlQueries(child, queries, seen);
  }
};

const collectClickTimeIndexPatterns = (dashboard: DashboardApi): string[] => {
  const indexPatterns = new Set<string>();
  const children = dashboard.children$.getValue();

  for (const panelId of Object.keys(children)) {
    let serializedState: object | undefined;
    try {
      serializedState = dashboard.getDashboardPanelFromId(panelId).serializedState;
    } catch {
      // The child can be published before its layout entry exists.
      serializedState = undefined;
    }

    if (serializedState) {
      const queries: string[] = [];
      collectEsqlQueries(serializedState, queries, new Set());
      for (const query of queries) {
        try {
          const indexPattern = getIndexPatternFromESQLQuery(query);
          if (indexPattern) {
            indexPatterns.add(indexPattern);
          }
        } catch {
          // Skip queries the ES|QL parser cannot read. Other panels still resolve.
        }
      }
    }
  }

  return [...indexPatterns];
};

// Same `FROM <index>` data view a value click builds, including dashboards whose
// persisted ad-hoc id is still the shared migration template hash.
const loadClickTimeDataViews = async (
  dashboard: DashboardApi,
  dataViewsService: DataViewsPublicPluginStart,
  http: HttpStart
): Promise<DataView[]> => {
  const indexPatterns = collectClickTimeIndexPatterns(dashboard);
  return Promise.all(
    indexPatterns.map((indexPattern) =>
      getESQLAdHocDataview({
        query: `FROM ${indexPattern}`,
        dataViewsService,
        http,
      })
    )
  );
};

const mergeDataViews = (
  published: DataView[] | undefined,
  clickTimeViews: DataView[]
): DataView[] => {
  const merged = new Map<string, DataView>();
  for (const view of [...(published ?? []), ...clickTimeViews]) {
    if (view.id && !merged.has(view.id)) {
      merged.set(view.id, view);
    }
  }
  return [...merged.values()];
};

interface DashboardViewProps {
  initialViewMode: ViewMode;
}

const DashboardViewComponent: React.FC<DashboardViewProps> = ({
  initialViewMode,
}: DashboardViewProps) => {
  const { fromStr, toStr, from, to } = useDeepEqualSelector((state) =>
    pick(['fromStr', 'toStr', 'from', 'to'], inputsSelectors.globalTimeRangeSelector(state))
  );
  const timeRange = useMemo(() => ({ from, to, fromStr, toStr }), [from, fromStr, to, toStr]);
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { show: canReadDashboard } = useCapabilities<DashboardCapabilities>('dashboard_v2');
  const errorState = useMemo(
    () => (canReadDashboard ? null : DashboardViewPromptState.NoReadPermission),
    [canReadDashboard]
  );
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const { detailName: savedObjectId } = useParams<{ detailName?: string }>();

  const { dashboardContainer, dashboardInternalApi, handleDashboardLoaded } =
    useDashboardRenderer(savedObjectId);
  const { http, dataViews } = useKibana().services;
  const [dashboardDataViews, setDashboardDataViews] = useState<DataView[] | undefined>();
  useEffect(() => {
    if (!dashboardContainer) {
      setDashboardDataViews(undefined);
      return;
    }

    let cancelled = false;
    let requestId = 0;
    const subscription = dashboardContainer.dataViews$.subscribe((publishedDataViews) => {
      const currentRequest = ++requestId;
      loadClickTimeDataViews(dashboardContainer, dataViews, http)
        .then((clickTimeViews) => {
          if (!cancelled && currentRequest === requestId) {
            setDashboardDataViews(mergeDataViews(publishedDataViews, clickTimeViews));
          }
        })
        .catch(() => {
          if (!cancelled && currentRequest === requestId) {
            setDashboardDataViews(publishedDataViews?.length ? publishedDataViews : undefined);
          }
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [dashboardContainer, dataViews, http]);
  const dashboardTitle = useDashboardTitle(dashboardContainer);
  const onDashboardToolBarLoad = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);
  const { dataView } = useDataView();
  const { euiTheme } = useEuiTheme();
  const filtersGlobalStyles = useMemo(
    () =>
      css({
        borderBottom: euiTheme.border.thin,
      }),
    [euiTheme.border.thin]
  );

  return (
    <>
      <FiltersGlobal color="plain" hasBorder={false} panelCss={filtersGlobalStyles}>
        <SiemSearchBar
          dataView={dataView}
          additionalDataViews={dashboardDataViews}
          id={InputsModelId.global}
        />
      </FiltersGlobal>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup
          direction="column"
          css={dashboardViewFlexGroupStyle}
          gutterSize="none"
          data-test-subj="dashboard-view-wrapper"
        >
          <EuiFlexItem grow={false}>
            {dashboardContainer && dashboardInternalApi && (
              <DashboardToolBar
                dashboardContainer={dashboardContainer}
                dashboardInternalApi={dashboardInternalApi}
                onLoad={onDashboardToolBarLoad}
              />
            )}
          </EuiFlexItem>
          {!errorState && (
            <EuiFlexItem grow>
              <DashboardRenderer
                query={query}
                filters={filters}
                canReadDashboard={canReadDashboard}
                dashboardContainer={dashboardContainer}
                id={`dashboard-view-${savedObjectId}`}
                onDashboardContainerLoaded={handleDashboardLoaded}
                savedObjectId={savedObjectId}
                timeRange={timeRange}
                viewMode={viewMode}
              />
            </EuiFlexItem>
          )}
          {errorState && (
            <EuiFlexItem data-test-subj="dashboard-view-error-prompt-wrapper" grow>
              <StatusPrompt currentState={errorState} />
            </EuiFlexItem>
          )}
          <SpyRoute
            pageName={SecurityPageName.dashboards}
            state={{ dashboardName: dashboardTitle }}
          />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
