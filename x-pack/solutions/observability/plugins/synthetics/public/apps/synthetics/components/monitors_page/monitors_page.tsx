/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux-v7';
import { Redirect } from 'react-router-dom';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

import { MonitorsMWsCallout } from '../common/mws_callout/monitors_mws_callout';
import { DisabledCallout } from './management/disabled_callout';
import { useOverviewStatus } from './hooks/use_overview_status';
import { isExternalOverviewMonitor } from '../../state/overview_status';
import { selectOverviewPageState } from '../../state';
import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';
import { useCpsLinkedProjects } from '../../hooks/use_cps_linked_projects';
import { shouldRedirectToGettingStarted } from './hooks/should_redirect_to_getting_started';

import { useLocations } from '../../hooks';

import { Loader } from './management/loader/loader';
import { useEnablement } from '../../hooks/use_enablement';

import { EnablementEmptyState } from './management/synthetics_enablement/synthetics_enablement';
import { MonitorListContainer } from './management/monitor_list_container';
import { useMonitorListBreadcrumbs } from './hooks/use_breadcrumbs';
import { useMonitorList } from './hooks/use_monitor_list';
import * as labels from './management/labels';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'monitors' });
  useTrackPageview({ app: 'synthetics', path: 'monitors', delay: 15000 });

  useMonitorListBreadcrumbs();

  const { error: enablementError, isEnabled, loading: enablementLoading } = useEnablement();

  const {
    allConfigs,
    settled: overviewSettled,
    error: overviewError,
  } = useOverviewStatus({
    scopeStatusByLocation: false,
  });
  const { cpsReady, hasLinkedProjects } = useCpsLinkedProjects();

  const pageState = useSelector(selectOverviewPageState);

  const monitorListProps = useMonitorList();
  const { syntheticsMonitors, loading: monitorsLoading, absoluteTotal, loaded } = monitorListProps;

  const { loading: locationsLoading } = useLocations();
  const showEmptyState = isEnabled !== undefined && syntheticsMonitors.length === 0;

  // A monitor filter is active. `allConfigs` is filtered (the active filter is forwarded to
  // the overview-status request), so an empty result under a filter doesn't prove the
  // deployment is empty — see the same guard in `overview_page.tsx`. The date range is
  // excluded on purpose: it scopes status, not which monitors exist.
  const hasActiveOverviewFilter = Boolean(
    pageState.query ||
      pageState.tags?.length ||
      pageState.locations?.length ||
      pageState.monitorTypes?.length ||
      pageState.projects?.length ||
      pageState.schedules?.length
  );

  // Ping-only Heartbeat / Elastic Agent (and CCS remote) monitors have no saved object,
  // so they are absent from `absoluteTotal` but surface in the overview status
  // `allConfigs`. Don't redirect to Getting Started when the only monitors are ping-driven.
  //
  // A failed status fetch must not look like an empty install (CPS origin-only
  // races used to onboard the user away from linked-project remotes).
  //
  // We also don't redirect while a monitor filter is active: a filter that excludes the
  // ping-only monitors would otherwise make `allConfigs` empty and wrongly onboard away
  // from a filtered view of a ping-only deployment.
  const hasNoMonitors = shouldRedirectToGettingStarted({
    absoluteTotal,
    overviewSettled,
    overviewError: Boolean(overviewError),
    hasActiveFilter: hasActiveOverviewFilter,
    hasExternalMonitors: allConfigs.some(isExternalOverviewMonitor),
    cpsReady,
    hasLinkedProjects,
  });

  if (isEnabled && !monitorsLoading && loaded && hasNoMonitors) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  return (
    <>
      <Loader
        loading={enablementLoading || locationsLoading}
        error={Boolean(enablementError)}
        loadingTitle={labels.LOADING_LABEL}
        errorTitle={labels.ERROR_HEADING_LABEL}
        errorBody={labels.ERROR_HEADING_BODY}
      >
        <DisabledCallout total={absoluteTotal} />
        <MonitorsMWsCallout />
        <MonitorListContainer isEnabled={isEnabled} monitorListProps={monitorListProps} />
      </Loader>
      {showEmptyState && <EnablementEmptyState />}
    </>
  );
};
