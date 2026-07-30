/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

import { MonitorsMWsCallout } from '../common/mws_callout/monitors_mws_callout';
import { DisabledCallout } from './management/disabled_callout';
import { useOverviewStatus } from './hooks/use_overview_status';
import { isExternalOverviewMonitor } from '../../state/overview_status';
import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';

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

  const { allConfigs, settled: overviewSettled } = useOverviewStatus({
    scopeStatusByLocation: false,
  });

  const monitorListProps = useMonitorList();
  const { syntheticsMonitors, loading: monitorsLoading, absoluteTotal, loaded } = monitorListProps;

  const { loading: locationsLoading } = useLocations();
  const showEmptyState = isEnabled !== undefined && syntheticsMonitors.length === 0;

  // Ping-only Heartbeat / Elastic Agent (and CCS remote) monitors have no saved object,
  // so they are absent from `absoluteTotal` but surface in the overview status
  // `allConfigs`. Don't redirect to Getting Started when the only monitors are ping-driven.
  //
  // `overviewSettled` is true once the status request has completed, success OR failure.
  // A failed request must still count as settled (the reducer never flips `loaded` on
  // error, and `error` is transient), otherwise a truly empty deployment would be stranded
  // on the management page whenever the status request fails.
  const hasNoMonitors =
    absoluteTotal === 0 && overviewSettled && !allConfigs.some(isExternalOverviewMonitor);

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
