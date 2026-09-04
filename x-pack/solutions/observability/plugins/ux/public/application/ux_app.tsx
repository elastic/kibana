/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { RouteComponentProps, RouteProps } from 'react-router-dom';
import { Redirect, useLocation } from 'react-router-dom';
import {
  RouterProvider,
  createRouter,
  RouteRenderer,
  Outlet,
} from '@kbn/typed-react-router-config';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import * as t from 'io-ts';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { DatePickerContextProvider } from '@kbn/observability-plugin/public';
import { InspectorContextProvider, useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { CsmSharedContextProvider } from '../components/app/rum_dashboard/csm_shared_context';
import { RumAppsPage } from '../components/app/rum_apps/rum_apps_page';
import { RumGlobalErrorsPage } from '../components/app/rum_global_errors';
import { DASHBOARD_LABEL, RumHome, type UxHomeTab } from '../components/app/rum_dashboard/rum_home';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { UxInspectBridge } from '../components/app/rum_dashboard/action_menu/ux_inspect_bridge';

import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { UxDefaultDateRange } from '../hooks/use_date_range_redirect';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { createStaticDataView } from '../services/rest/data_view';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { PluginContext } from '../context/plugin_context';
import { SessionPlayerPage } from '../components/session_replay/session_player_page';
import { SessionDetailPage } from '../components/session_replay/session_detail_page';
import { RumSettingsPage } from '../components/app/rum_settings/rum_settings_page';
import { uxAppHref, serviceNameFromSearch, uxQueryString } from '../utils/rum_search';
import { serviceNameFromPath, uxAppPath, uxTabSuffix } from '../utils/ux_app_path';
import { uxHomeBreadcrumbs } from './ux_breadcrumbs';
import { UX_HOME_PATHS, UX_TAB_SUFFIXES, matchUxHomeRoute } from './ux_home_route';
import { UxTourProvider } from '../components/app/rum_tour/ux_tour_context';

export type BreadcrumbTitle<T = {}> =
  | string
  // @ts-expect-error upgrade typescript v4.9.5
  | ((props: RouteComponentProps<T>) => string)
  | null;

export interface RouteDefinition<T = any> extends RouteProps {
  breadcrumb: BreadcrumbTitle<T>;
}

export const uxRoutes: RouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: () => <Redirect to="/ux" />,
    breadcrumb: DASHBOARD_LABEL,
  },
];

function UxHomePage({
  tab,
  templateId,
  serviceName,
  inventoryHref,
  overviewHref,
}: {
  tab: UxHomeTab;
  templateId?: string;
  serviceName: string;
  inventoryHref: string;
  overviewHref: string;
}) {
  useBreadcrumbs(uxHomeBreadcrumbs({ tab, templateId, serviceName, inventoryHref, overviewHref }));

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab={tab} templateId={templateId} />
    </div>
  );
}

// Parent stays mounted across tab changes so the app selector / date picker
// do not remount and refetch. Session detail and settings skip this chrome.
function UxHomeChrome() {
  return (
    <UxTourProvider>
      <UxHomeChromeBody />
    </UxTourProvider>
  );
}

function UxHomeChromeBody() {
  const { pathname, search } = useLocation();
  const home = matchUxHomeRoute(pathname);
  const pathServiceName = home?.serviceName;
  const queryServiceName = serviceNameFromSearch(search);
  const { http } = useKibanaServices();

  if (queryServiceName && queryServiceName !== pathServiceName) {
    const suffix = pathServiceName
      ? uxTabSuffix(pathname)
      : home?.templateId
      ? `/reports/${encodeURIComponent(home.templateId)}`
      : home && home.tab !== 'overview'
      ? pathname.replace(/\/+$/, '')
      : '';
    return (
      <Redirect
        to={{
          pathname: uxAppPath(queryServiceName, suffix),
          search: uxQueryString(search, { serviceName: '' }).replace(/^\?/, ''),
        }}
      />
    );
  }

  if (!home) {
    return <Outlet />;
  }

  if (!pathServiceName) {
    if (home.tab === 'errors') {
      return <RumGlobalErrorsPage />;
    }
    if (home.tab !== 'overview') {
      return <Redirect to={{ pathname: '/', search }} />;
    }
    return <RumAppsPage />;
  }

  return (
    <UxHomePage
      tab={home.tab}
      templateId={home.templateId}
      serviceName={pathServiceName}
      inventoryHref={uxAppHref(http.basePath.prepend, { search })}
      overviewHref={uxAppHref(http.basePath.prepend, { search, serviceName: pathServiceName })}
    />
  );
}

const uxHomeChild = <></>;

const serviceNameParams = t.type({
  path: t.type({
    serviceName: t.string,
  }),
});

const sessionParams = t.type({
  path: t.type({
    sessionId: t.string,
  }),
});

const serviceNameSessionParams = t.type({
  path: t.type({
    serviceName: t.string,
    sessionId: t.string,
  }),
});

const templateParams = t.type({
  path: t.type({
    templateId: t.string,
  }),
});

const serviceNameTemplateParams = t.type({
  path: t.type({
    serviceName: t.string,
    templateId: t.string,
  }),
});

const settingsTabParams = t.type({
  path: t.type({
    tab: t.string,
  }),
});

const serviceNameSettingsTabParams = t.type({
  path: t.type({
    serviceName: t.string,
    tab: t.string,
  }),
});

function LegacySessionSettingsRedirect() {
  const { pathname, search } = useLocation();
  return (
    <Redirect
      to={{
        pathname: uxAppPath(serviceNameFromPath(pathname), '/settings/capture'),
        search,
      }}
    />
  );
}

const legacyTabRoutes = Object.fromEntries(
  Object.keys(UX_HOME_PATHS).map((path) => [path, { element: uxHomeChild }])
);

const appTabRoutes = Object.fromEntries(
  Object.keys(UX_TAB_SUFFIXES)
    .filter((suffix) => suffix.length > 0)
    .map((suffix) => [
      `/{serviceName}${suffix}`,
      { params: serviceNameParams, element: uxHomeChild },
    ])
);

const uxRouter = createRouter({
  '/': {
    element: <UxHomeChrome />,
    children: {
      '/': { element: uxHomeChild },
      ...legacyTabRoutes,
      '/reports/{templateId}': {
        params: templateParams,
        element: uxHomeChild,
      },
      '/settings': {
        element: <RumSettingsPage />,
      },
      '/settings/{tab}': {
        params: settingsTabParams,
        element: <RumSettingsPage />,
      },
      '/session-replay/settings': {
        element: <LegacySessionSettingsRedirect />,
      },
      '/session-replay/{sessionId}': {
        params: sessionParams,
        element: <SessionDetailPage />,
      },
      '/session-replay/{sessionId}/replay': {
        params: sessionParams,
        element: <SessionPlayerPage />,
      },
      '/{serviceName}': {
        params: serviceNameParams,
        element: uxHomeChild,
      },
      ...appTabRoutes,
      '/{serviceName}/reports/{templateId}': {
        params: serviceNameTemplateParams,
        element: uxHomeChild,
      },
      '/{serviceName}/settings': {
        params: serviceNameParams,
        element: <RumSettingsPage />,
      },
      '/{serviceName}/settings/{tab}': {
        params: serviceNameSettingsTabParams,
        element: <RumSettingsPage />,
      },
      '/{serviceName}/session-replay/settings': {
        params: serviceNameParams,
        element: <LegacySessionSettingsRedirect />,
      },
      '/{serviceName}/session-replay/{sessionId}': {
        params: serviceNameSessionParams,
        element: <SessionDetailPage />,
      },
      '/{serviceName}/session-replay/{sessionId}/replay': {
        params: serviceNameSessionParams,
        element: <SessionPlayerPage />,
      },
    },
  },
});

export function UXAppRoot({
  appMountParameters,
  core,
  deps,
  corePlugins: {
    embeddable,
    inspector,
    maps,
    observability,
    observabilityShared,
    observabilityAIAssistant,
    exploratoryView,
    data,
    dataViews,
    lens,
    inference,
    agentBuilder,
    slo,
    apmShared,
  },
  isDev,
  spaceId,
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  corePlugins: ApmPluginStartDeps;
  isDev: boolean;
  spaceId: string;
}) {
  const { history } = appMountParameters;
  const plugins = { ...deps, maps };

  createCallApmApi(core);

  return (
    <KibanaRenderContextProvider {...core}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application: core.application,
          }}
        >
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              inspector,
              observability,
              observabilityShared,
              observabilityAIAssistant,
              embeddable,
              exploratoryView,
              data,
              dataViews,
              lens,
              inference,
              agentBuilder,
              slo,
              apmShared,
            }}
          >
            <KibanaThemeProvider
              theme={core.theme}
              modify={{
                breakpoint: {
                  xxl: 1600,
                  xxxl: 2000,
                },
              }}
            >
              <PluginContext.Provider
                value={{
                  appMountParameters,
                  exploratoryView,
                  observabilityShared,
                  spaceId,
                  isDev,
                }}
              >
                <RouterProvider history={history} router={uxRouter as any}>
                  <UxDefaultDateRange>
                    <DatePickerContextProvider>
                      <InspectorContextProvider>
                        <UxInspectBridge />
                        <UrlParamsProvider>
                          <CsmSharedContextProvider>
                            <RouteRenderer />
                          </CsmSharedContextProvider>
                        </UrlParamsProvider>
                      </InspectorContextProvider>
                    </DatePickerContextProvider>
                  </UxDefaultDateRange>
                </RouterProvider>
              </PluginContext.Provider>
            </KibanaThemeProvider>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

export const renderApp = ({
  core,
  deps,
  appMountParameters,
  corePlugins,
  isDev,
  spaceId,
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ApmPluginStartDeps;
  isDev: boolean;
  spaceId: string;
}) => {
  const { element } = appMountParameters;

  createCallApmApi(core);

  // Creating the static data view requires write access to saved objects, so
  // only attempt it for users who can save. Read-only users (e.g. `viewer`)
  // fall back to the ad-hoc data view and would otherwise hit a 403 here.
  if (core.application.capabilities.savedObjectsManagement.edit) {
    createStaticDataView().catch((e) => {
      // eslint-disable-next-line no-console
      console.log('Error creating static data view', e);
    });
  }

  ReactDOM.render(
    <UXAppRoot
      appMountParameters={appMountParameters}
      core={core}
      deps={deps}
      corePlugins={corePlugins}
      isDev={isDev}
      spaceId={spaceId}
    />,
    element
  );
  return () => {
    corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
