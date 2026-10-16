/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSection } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/observability-plugin/public';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { CsmSharedContextProvider } from '../app/rum_dashboard/csm_shared_context';
import { DashboardToolbar } from '../app/rum_dashboard/rum_home';
import { RumOverview } from '../app/rum_dashboard';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import type { PluginContextValue } from '../../context/plugin_context';
import { PluginContext } from '../../context/plugin_context';
import { createCallApmApi } from '../../services/rest/create_call_apm_api';
import { uxRouter } from '../../application/ux_app';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import type { ClassicRumDashboardProps } from './types';
import { useEmbeddedHistory } from './use_embedded_history';

/** Builds the dashboard with the same providers as the ux app, minus the ones its host provides. */
export const createClassicRumDashboard = ({
  core,
  setupDeps,
  startDeps,
  isDev,
  spaceId,
}: {
  core: CoreStart;
  setupDeps: ApmPluginSetupDeps;
  startDeps: ApmPluginStartDeps;
  isDev: boolean;
  spaceId: string;
}): React.ComponentType<ClassicRumDashboardProps> => {
  // The ux app does this on mount; the dashboard can render without the app ever being mounted.
  createCallApmApi(core);

  const services = { ...core, ...setupDeps, ...startDeps };
  const pluginContext: PluginContextValue = {
    exploratoryView: startDeps.exploratoryView,
    observabilityShared: startDeps.observabilityShared,
    spaceId,
    isDev,
  };

  return ({ serviceName, timeRange, onTimeRangeChange }) => {
    // An in-memory URL keeps the dashboard state out of the host app's URL.
    const history = useEmbeddedHistory({ serviceName, timeRange, onTimeRangeChange });

    return (
      <KibanaContextProvider services={services}>
        <PluginContext.Provider value={pluginContext}>
          <RouterProvider history={history} router={uxRouter}>
            <DatePickerContextProvider>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <CsmSharedContextProvider>
                    <EuiPageSection paddingSize="m" restrictWidth={false}>
                      {/* The host pins the service, so the select that switches it is hidden. */}
                      <DashboardToolbar showWebApplicationSelect={false} />
                      <RumOverview />
                    </EuiPageSection>
                  </CsmSharedContextProvider>
                </UrlParamsProvider>
              </InspectorContextProvider>
            </DatePickerContextProvider>
          </RouterProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    );
  };
};
