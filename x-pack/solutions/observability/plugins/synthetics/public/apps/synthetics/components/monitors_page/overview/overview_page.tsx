/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { Redirect, useLocation } from 'react-router-dom';
import { DisabledCallout } from '../management/disabled_callout';
import { FilterGroup } from '../common/monitor_filters/filter_group';
import { OverviewAlerts } from './overview/overview_alerts';
import { useEnablement } from '../../../hooks';
import { selectOverviewView, selectServiceLocationsState } from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';
import { isExternalOverviewMonitor } from '../../../state/overview_status';
import { GETTING_STARTED_ROUTE, MONITORS_ROUTE } from '../../../../../../common/constants';

import { useMonitorList } from '../hooks/use_monitor_list';
import { useOverviewStatus } from '../hooks/use_overview_status';
import { useSyncOverviewDateRange } from '../common/use_sync_overview_date_range';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';
import { OverviewGrid } from './overview/overview_grid';
import { OverviewStatus } from './overview/overview_status';
import { QuickFilters } from './overview/quick_filters';
import { SearchField } from '../common/search_field';
import { NoMonitorsFound } from '../common/no_monitors_found';
import { OverviewErrors } from './overview/overview_errors/overview_errors';
import { AlertingCallout } from '../../common/alerting_callout/alerting_callout';
import { useSyntheticsPageReady } from '../../../hooks/use_synthetics_page_ready';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  // Mounted at the page level (above any empty-state early returns) so the
  // URL stays the source of truth for the date range even when the grid
  // unmounts because the previous request returned zero monitors.
  useSyncOverviewDateRange();

  const view = useSelector(selectOverviewView);

  const dispatch = useDispatch();

  const { search } = useLocation();

  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useSyntheticsPageReady({
    meta: { description: '[ttfmp_synthetics] Synthetics overview page has loaded monitor data.' },
  });

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  const { isEnabled, loading: enablementLoading } = useEnablement();

  const {
    allConfigs,
    loaded: overviewLoaded,
    settled: overviewSettled,
  } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

  const {
    loading: monitorsLoading,
    loaded: monitorsLoaded,
    handleFilterChange,
    absoluteTotal,
  } = useMonitorList();

  // Ping-only Heartbeat / Elastic Agent (and CCS remote) monitors have no saved object,
  // so they are absent from `absoluteTotal` but present in the overview status
  // `allConfigs`. Wait for the overview status to settle and keep the page mounted when it
  // holds such monitors, so we don't redirect to Getting Started (and flash the grid)
  // when the only monitors are ping-driven.
  //
  // `overviewSettled` is true once the status request has completed, success OR failure.
  // A failed request must still count as settled: the reducer never flips `loaded` on
  // error (and the `error` flag is cleared by the OverviewStatus toast effect), so gating
  // on those alone would strand a truly empty deployment on an empty overview whenever the
  // status request fails.
  const hasNoMonitors =
    !search &&
    !enablementLoading &&
    monitorsLoaded &&
    absoluteTotal === 0 &&
    overviewSettled &&
    !allConfigs.some(isExternalOverviewMonitor);

  if (hasNoMonitors && !monitorsLoading && isEnabled) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  if (!isEnabled && hasNoMonitors) {
    return <Redirect to={MONITORS_ROUTE} />;
  }

  const hasMonitors = !(monitorsLoaded && overviewLoaded && allConfigs?.length === 0);

  return (
    <>
      <DisabledCallout total={absoluteTotal} />
      <AlertingCallout />
      <EuiFlexGroup gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <SearchField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <QuickFilters />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FilterGroup handleFilterChange={handleFilterChange} showRemoteClusterFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {hasMonitors ? (
        <>
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={false}>
              <OverviewStatus />
            </EuiFlexItem>
            <EuiFlexItem grow={3} css={{ minWidth: 300 }}>
              <OverviewErrors />
            </EuiFlexItem>
            <EuiFlexItem grow={3} css={{ minWidth: 300 }}>
              <OverviewAlerts />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <OverviewGrid view={view} />
        </>
      ) : (
        <NoMonitorsFound />
      )}
    </>
  );
};
