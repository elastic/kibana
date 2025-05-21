/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

import { DisabledCallout } from './management/disabled_callout';
import { useOverviewStatus } from './hooks/use_overview_status';
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

  useOverviewStatus({ scopeStatusByLocation: false });

  const monitorListProps = useMonitorList();
  const { syntheticsMonitors, loading: monitorsLoading, absoluteTotal, loaded } = monitorListProps;

  const { loading: locationsLoading } = useLocations();
  const showEmptyState = isEnabled !== undefined && syntheticsMonitors.length === 0;

  if (isEnabled && !monitorsLoading && absoluteTotal === 0 && loaded) {
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
        <MonitorListContainer isEnabled={isEnabled} monitorListProps={monitorListProps} />
      </Loader>
      {showEmptyState && <EnablementEmptyState />}
    </>
  );
};
