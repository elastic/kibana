/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

import { Redirect, useLocation } from 'react-router-dom';
import { OutPortal } from 'react-reverse-portal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCloneMonitor } from './hooks/use_clone_monitor';
import { useCanUsePublicLocations } from '../../../../hooks/use_capabilities';
import { CanUsePublicLocationsCallout } from './steps/can_use_public_locations_callout';
import { DisabledCallout } from '../monitors_page/management/disabled_callout';
import { useEnablement } from '../../hooks';
import { getServiceLocations, selectServiceLocationsState } from '../../state';

import { useKibanaSpace } from './hooks';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { LocationsLoadingError } from './locations_loading_error';
import { ADD_MONITOR_STEPS } from './steps/step_config';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { GETTING_STARTED_ROUTE, MONITORS_ROUTE } from '../../../../../common/constants';
import { PLUGIN } from '../../../../../common/constants/plugin';
import type { ClientPluginsStart } from '../../../../plugin';
import { CREATE_MONITOR_TITLE, MONITORS_TITLE, SyntheticsPage } from '../common/app_header';
import { InspectMonitorHeaderProvider, useInspectMonitorHeader } from './inspect_monitor_header';
import { InspectMonitorPortalNode } from './portals';

export const MonitorAddPage = () => {
  useTrackPageview({ app: 'synthetics', path: 'add-monitor' });
  const { space } = useKibanaSpace();
  const { search } = useLocation();
  useTrackPageview({ app: 'synthetics', path: 'add-monitor', delay: 15000 });
  useMonitorAddEditBreadcrumbs();

  useEnablement();

  const canUsePublicLocations = useCanUsePublicLocations();
  const { application } = useKibana<ClientPluginsStart>().services;
  const { register, primaryActionItem } = useInspectMonitorHeader();

  const { data: cloneMonitor, loading: cloneMonitorLoading } = useCloneMonitor();

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);
  const {
    locations,
    locationsLoaded,
    loading: locationsLoading,
    error: locationsError,
  } = useSelector(selectServiceLocationsState);

  // `locationsLoaded` is set when the request starts, not when it finishes.
  if (locationsLoaded && !locationsLoading && !locationsError && locations.length === 0) {
    return <Redirect to={{ pathname: GETTING_STARTED_ROUTE, search }} />;
  }

  return (
    <InspectMonitorHeaderProvider register={register}>
      <SyntheticsPage
        title={CREATE_MONITOR_TITLE}
        back={{
          href: `${application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? ''}${MONITORS_ROUTE}`,
          label: MONITORS_TITLE,
        }}
        menu={{ primaryActionItem }}
      >
        <OutPortal node={InspectMonitorPortalNode} />
        {locationsError ? (
          <LocationsLoadingError />
        ) : !locationsLoaded || locationsLoading || cloneMonitorLoading ? (
          <LoadingState />
        ) : (
          <MonitorForm
            space={space?.id}
            defaultValues={
              cloneMonitor
                ? {
                    ...cloneMonitor,
                    name: `${cloneMonitor.name} - copy`,
                  }
                : undefined
            }
          >
            <DisabledCallout />
            <CanUsePublicLocationsCallout canUsePublicLocations={canUsePublicLocations} />
            <MonitorSteps stepMap={ADD_MONITOR_STEPS} />
          </MonitorForm>
        )}
      </SyntheticsPage>
    </InspectMonitorHeaderProvider>
  );
};
