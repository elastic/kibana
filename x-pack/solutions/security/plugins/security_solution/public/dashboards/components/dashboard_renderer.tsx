/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardLocatorParams,
} from '@kbn/dashboard-plugin/public';
import { DashboardRenderer as DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { useDispatch } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public/dashboard_container/external_api/dashboard_renderer';
import { APP_UI_ID } from '../../../common';
import { DASHBOARDS_PATH, SecurityPageName } from '../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useKibana, useNavigateTo } from '../../common/lib/kibana';
import { inputsActions } from '../../common/store/inputs';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useSecurityTags } from '../context/dashboard_context';

const initialInput = new BehaviorSubject<
  ReturnType<NonNullable<DashboardCreationOptions['getInitialInput']>>
>({});

const DashboardRendererComponent = ({
  canReadDashboard,
  dashboardContainer,
  filters,
  id,
  inputId = InputsModelId.global,
  onDashboardContainerLoaded,
  query,
  savedObjectId,
  timeRange,
  viewMode = ViewMode.VIEW,
}: {
  canReadDashboard: boolean;
  dashboardContainer?: DashboardApi;
  filters?: Filter[];
  id: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardApi) => void;
  query?: Query;
  savedObjectId: string | undefined;
  timeRange: {
    from: string;
    fromStr?: string | undefined;
    to: string;
    toStr?: string | undefined;
  };
  viewMode?: ViewMode;
}) => {
  const { embeddable } = useKibana().services;
  const dispatch = useDispatch();

  const securityTags = useSecurityTags();
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const firstSecurityTagId = securityTags?.[0]?.id;

  const isCreateDashboard = !savedObjectId;

  const getSecuritySolutionDashboardUrl = useCallback(
    ({ dashboardId }: DashboardLocatorParams) => {
      return getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: dashboardId,
      });
    },
    [getSecuritySolutionUrl]
  );

  const goToDashboard = useCallback<NonNullable<DashboardRendererProps['locator']>['navigate']>(
    /**
     * Note: Due to the query bar being separate from the portable dashboard, the "Use filters and query from origin
     * dashboard" and "Use date range from origin dashboard" Link embeddable settings do not make sense in this context.
     * Regardless of these settings, navigation to a different dashboard will **always** keep the query state the same.
     * I have chosen to keep this consistent **even when** the dashboard is opened in a new tab.
     *
     * If we want portable dashboard to interact with the query bar in the same way it does in the dashboard app so these
     * settings apply, we would need to refactor this portable dashboard. We might also want to make the security app use
     * locators in that refactor, as well - not only would this clean up some tech debt, it would also make it so that
     * control selections could also be translated to filter pills on navigation.
     */
    async (params) => {
      navigateTo({
        url: getSecuritySolutionDashboardUrl(params),
      });
    },
    [getSecuritySolutionDashboardUrl, navigateTo]
  );

  const locator = useMemo(() => {
    return {
      navigate: goToDashboard,
      getRedirectUrl: getSecuritySolutionDashboardUrl,
    };
  }, [goToDashboard, getSecuritySolutionDashboardUrl]);

  const getCreationOptions: () => Promise<DashboardCreationOptions> = useCallback(() => {
    return Promise.resolve({
      useSessionStorageIntegration: true,
      getInitialInput: () => {
        return initialInput.value;
      },
      getIncomingEmbeddable: () =>
        embeddable.getStateTransfer().getIncomingEmbeddablePackage(APP_UI_ID, true),
      getEmbeddableAppContext: (dashboardId?: string) => ({
        getCurrentPath: () =>
          dashboardId ? `${DASHBOARDS_PATH}/${dashboardId}/edit` : `${DASHBOARDS_PATH}/create`,
        currentAppId: APP_UI_ID,
      }),
    });
  }, [embeddable]);

  const refetchByForceRefresh = useCallback(() => {
    dashboardContainer?.forceRefresh();
  }, [dashboardContainer]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        refetch: refetchByForceRefresh,
        loading: false,
        inspect: null,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId, refetchByForceRefresh]);

  useEffect(() => {
    dashboardContainer?.setFilters(filters);
  }, [dashboardContainer, filters]);

  useEffect(() => {
    dashboardContainer?.setQuery(query);
  }, [dashboardContainer, query]);

  useEffect(() => {
    dashboardContainer?.setTimeRange(timeRange);
  }, [dashboardContainer, timeRange]);

  useEffect(() => {
    if (isCreateDashboard && firstSecurityTagId) dashboardContainer?.setTags([firstSecurityTagId]);
  }, [dashboardContainer, firstSecurityTagId, isCreateDashboard]);

  useEffect(() => {
    /** We need to update the initial input on navigation so that changes to filter pills, queries, etc. get applied */
    initialInput.next({ timeRange, viewMode, query, filters });
  }, [timeRange, viewMode, query, filters]);

  /** Dashboard renderer is stored in the state as it's a temporary solution for
   *  https://github.com/elastic/kibana/issues/167751
   **/
  const [dashboardContainerRenderer, setDashboardContainerRenderer] = useState<
    React.ReactElement | undefined
  >(undefined);

  useEffect(() => {
    setDashboardContainerRenderer(
      <DashboardContainerRenderer
        locator={locator}
        onApiAvailable={onDashboardContainerLoaded}
        savedObjectId={savedObjectId}
        getCreationOptions={getCreationOptions}
      />
    );

    return () => {
      setDashboardContainerRenderer(undefined);
    };
  }, [
    getCreationOptions,
    onDashboardContainerLoaded,
    refetchByForceRefresh,
    savedObjectId,
    locator,
  ]);

  return canReadDashboard ? <>{dashboardContainerRenderer}</> : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
