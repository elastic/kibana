/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { useParams } from 'react-router-dom';
import { pick } from 'lodash/fp';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useCapabilities } from '../../../common/lib/kibana';
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

/* dshDashboardViewport--panelExpanded: dashboard_viewport.tsx
   dshLayout-isMaximizedPanel: dashboard_grid.tsx */
const dashboardExpandedStyles = {
  '&:has(.dshDashboardViewport--panelExpanded)': {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: '1 1 auto',
    height: '100%',
    minHeight: 0,
  },
};

const dashboardViewFlexGroupStyle = {
  minHeight: 'calc(100vh - 140px)',
  ...dashboardExpandedStyles,
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
  const [dashboardDataViews, setDashboardDataViews] = useState<DataView[] | undefined>();
  useEffect(() => {
    if (!dashboardContainer) {
      setDashboardDataViews(undefined);
      return;
    }

    const subscription = dashboardContainer.dataViews$.subscribe((publishedDataViews) => {
      setDashboardDataViews(publishedDataViews?.length ? publishedDataViews : undefined);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardContainer]);
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
      <SecuritySolutionPageWrapper css={dashboardExpandedStyles}>
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
            <EuiFlexItem css={dashboardExpandedStyles} grow>
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
