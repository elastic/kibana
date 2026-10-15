/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiPageSection } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/observability-plugin/public';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { CsmSharedContextProvider } from '../components/app/rum_dashboard/csm_shared_context';
import { DashboardToolbar } from '../components/app/rum_dashboard/rum_home';
import { RumOverview } from '../components/app/rum_dashboard';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { PluginContext } from '../context/plugin_context';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { uxRouter } from '../application/ux_app';
import type { ApmPluginSetupDeps, ApmPluginStartDeps, ClassicRumDashboardProps } from '../plugin';
import { useEmbeddedHistory } from './use_embedded_history';

export const createClassicRumDashboard =
  ({
    core,
    setupDeps,
    startDeps,
    isDev,
  }: {
    core: CoreStart;
    setupDeps: ApmPluginSetupDeps;
    startDeps: ApmPluginStartDeps;
    isDev: boolean;
  }): React.ComponentType<ClassicRumDashboardProps> =>
  ({ serviceName, timeRange, onTimeRangeChange }) => {
    createCallApmApi(core);

    const { observabilityShared, exploratoryView } = startDeps;
    const { value: activeSpace } = useAsync(async () => startDeps.spaces?.getActiveSpace(), []);

    // The dashboard keeps its own in-memory URL state, so the pinned service name never leaks
    // into, or gets overwritten by, the URL of the host app.
    const history = useEmbeddedHistory({ serviceName, timeRange, onTimeRangeChange });

    return (
      <KibanaContextProvider services={{ ...core, ...setupDeps, ...startDeps }}>
        <PluginContext.Provider
          value={{
            exploratoryView,
            observabilityShared,
            spaceId: activeSpace?.id ?? 'default',
            isDev,
          }}
        >
          <RouterProvider history={history} router={uxRouter}>
            <DatePickerContextProvider>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <CsmSharedContextProvider>
                    <EuiPageSection paddingSize="m" restrictWidth={false}>
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
