/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { isHeartbeatSyntheticsMonitor } from '../../../../../../common/runtime_types';
import { MONITORS_ROUTE } from '../../../../../../common/constants';
import { PLUGIN } from '../../../../../../common/constants/plugin';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useGetUrlParams } from '../../../hooks';
import {
  getMonitorDetailsAppHeaderTabs,
  type MonitorDetailsTab,
} from '../../monitor_details/get_monitor_details_app_header_tabs';
import { Actions } from '../../monitor_details/actions';
import { useFetchActiveAlerts } from '../../monitor_details/hooks/use_fetch_active_alerts';
import { useMonitorErrors } from '../../monitor_details/hooks/use_monitor_errors';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { MonitorDetailsLastRun } from '../../monitor_details/monitor_details_last_run';
import { MonitorDetailsLocation } from '../../monitor_details/monitor_details_location';
import { MonitorDetailsPageTitle } from '../../monitor_details/monitor_details_page_title';
import { MonitorDetailsStatus } from '../../monitor_details/monitor_details_status';
import { useMonitorDetailsPage } from '../../monitor_details/use_monitor_details_page';
import { MONITORS_TITLE, SyntheticsHeaderToolbar, SyntheticsPage } from './synthetics_page';

export function MonitorDetailsPage({
  selectedTab,
  children,
}: {
  selectedTab: MonitorDetailsTab;
  children: React.ReactNode;
}): React.ReactElement {
  const redirect = useMonitorDetailsPage();
  if (redirect) {
    return redirect;
  }

  return <MonitorDetailsPageChrome selectedTab={selectedTab}>{children}</MonitorDetailsPageChrome>;
}

const MonitorDetailsPageChrome = ({
  selectedTab,
  children,
}: {
  selectedTab: MonitorDetailsTab;
  children: React.ReactNode;
}) => {
  const { remoteName } = useGetUrlParams();
  if (remoteName) {
    return (
      <MonitorDetailsPageInner selectedTab={selectedTab} numberOfActiveAlerts={0}>
        {children}
      </MonitorDetailsPageInner>
    );
  }
  return (
    <MonitorDetailsPageWithAlerts selectedTab={selectedTab}>
      {children}
    </MonitorDetailsPageWithAlerts>
  );
};

const MonitorDetailsPageWithAlerts = ({
  selectedTab,
  children,
}: {
  selectedTab: MonitorDetailsTab;
  children: React.ReactNode;
}) => {
  const { numberOfActiveAlerts } = useFetchActiveAlerts();
  return (
    <MonitorDetailsPageInner selectedTab={selectedTab} numberOfActiveAlerts={numberOfActiveAlerts}>
      {children}
    </MonitorDetailsPageInner>
  );
};

const MonitorDetailsPageInner = ({
  selectedTab,
  numberOfActiveAlerts,
  children,
}: {
  selectedTab: MonitorDetailsTab;
  numberOfActiveAlerts: number;
  children: React.ReactNode;
}) => {
  const { search } = useLocation();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { remoteName } = useGetUrlParams();
  const { monitor } = useSelectedMonitor();
  const isReadOnly = Boolean(remoteName) || isHeartbeatSyntheticsMonitor(monitor);
  const { hasActiveError } = useMonitorErrors();
  const { application } = useKibana<ClientPluginsStart>().services;
  const syntheticsPath = application.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID);

  return (
    <SyntheticsPage
      title={monitor?.name ?? ''}
      back={{
        href: `${syntheticsPath}${MONITORS_ROUTE}`,
        label: MONITORS_TITLE,
      }}
      tabs={getMonitorDetailsAppHeaderTabs({
        syntheticsPath,
        selectedTab,
        monitorId,
        search,
        isReadOnly,
        hasActiveError,
        numberOfActiveAlerts: isReadOnly ? 0 : numberOfActiveAlerts,
      })}
      toolbar={
        <>
          <MonitorDetailsPageTitle hideName />
          <EuiSpacer size="s" />
          <SyntheticsHeaderToolbar>
            <MonitorDetailsLocation />
            <MonitorDetailsStatus />
            <MonitorDetailsLastRun />
            <Actions />
          </SyntheticsHeaderToolbar>
        </>
      }
    >
      {children}
    </SyntheticsPage>
  );
};
