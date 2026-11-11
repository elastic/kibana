/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { History } from 'history';
import type { CoreStart } from '@kbn/core/public';
import { RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { KibanaServices } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/observability-plugin/public';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { CsmSharedContextProvider } from '../components/app/rum_dashboard/csm_shared_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import type { PluginContextValue } from '../context/plugin_context';
import { PluginContext } from '../context/plugin_context';

const uxRouter = createRouter({});

/** The contexts the RUM dashboard needs, shared by the ux app and the embedded dashboard. */
export function UxProviders<Services extends KibanaServices>({
  core,
  services,
  pluginContext,
  history,
  children,
}: {
  core: CoreStart;
  services: Services;
  pluginContext: PluginContextValue;
  history: History;
  children: React.ReactElement;
}) {
  return (
    <KibanaContextProvider services={services}>
      <KibanaThemeProvider theme={core.theme} modify={{ breakpoint: { xxl: 1600, xxxl: 2000 } }}>
        <PluginContext.Provider value={pluginContext}>
          <RouterProvider history={history} router={uxRouter}>
            <DatePickerContextProvider>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <CsmSharedContextProvider>{children}</CsmSharedContextProvider>
                </UrlParamsProvider>
              </InspectorContextProvider>
            </DatePickerContextProvider>
          </RouterProvider>
        </PluginContext.Provider>
      </KibanaThemeProvider>
    </KibanaContextProvider>
  );
}
