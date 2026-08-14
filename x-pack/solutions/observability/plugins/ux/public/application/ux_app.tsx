/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect } from 'react-router-dom';
import {
  RouterProvider,
  createRouter,
  RouteRenderer,
  useParams,
} from '@kbn/typed-react-router-config';
import { i18n } from '@kbn/i18n';
import type { RouteComponentProps, RouteProps } from 'react-router-dom';
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
import { DASHBOARD_LABEL, RumHome } from '../components/app/rum_dashboard/rum_home';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';

import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { createStaticDataView } from '../services/rest/data_view';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { PluginContext } from '../context/plugin_context';
import { SessionPlayerPage } from '../components/session_replay/session_player_page';
import { SessionDetailPage } from '../components/session_replay/session_detail_page';
import { SessionReplaySettingsPage } from '../components/session_replay/session_replay_settings_page';
import { UX_BREADCRUMBS } from './ux_breadcrumbs';
import { isRumReportTemplateId, rumReportTitle } from '../../common/rum_report';

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

function UxDashboardPage() {
  useBreadcrumbs(UX_BREADCRUMBS);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="overview" />
    </div>
  );
}

function UxPagesPage() {
  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.pages', {
        defaultMessage: 'Pages',
      }),
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="pages" />
    </div>
  );
}

function UxErrorsPage() {
  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.errors', {
        defaultMessage: 'Errors',
      }),
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="errors" />
    </div>
  );
}

function UxSessionReplayPage() {
  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.sessionReplay', {
        defaultMessage: 'Sessions',
      }),
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="session-replay" />
    </div>
  );
}

function UxSessionFunnelPage() {
  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.journeys', {
        defaultMessage: 'Journeys',
      }),
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="journeys" />
    </div>
  );
}

function UxReportsPage() {
  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.reports', {
        defaultMessage: 'Reporting',
      }),
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="reports" />
    </div>
  );
}

function UxReportViewPage() {
  const { path } = useParams('/reports/{templateId}') as unknown as {
    path: { templateId: string };
  };
  const templateId = path.templateId;
  const reportLabel = isRumReportTemplateId(templateId)
    ? rumReportTitle(templateId)
    : i18n.translate('xpack.ux.breadcrumbs.reportFallback', {
        defaultMessage: 'Report',
      });

  useBreadcrumbs([
    UX_BREADCRUMBS[0],
    {
      text: i18n.translate('xpack.ux.breadcrumbs.reports', {
        defaultMessage: 'Reporting',
      }),
    },
    { text: reportLabel },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
      <RumHome tab="reports" templateId={templateId} />
    </div>
  );
}

const uxRouter = createRouter({
  '/': {
    element: <UxDashboardPage />,
  },
  '/pages': {
    element: <UxPagesPage />,
  },
  '/errors': {
    element: <UxErrorsPage />,
  },
  '/session-replay': {
    element: <UxSessionReplayPage />,
  },
  '/funnels': {
    element: <UxSessionFunnelPage />,
  },
  '/patterns': {
    element: <UxSessionFunnelPage />,
  },
  '/journeys': {
    element: <UxSessionFunnelPage />,
  },
  '/reports': {
    element: <UxReportsPage />,
  },
  '/reports/{templateId}': {
    params: t.type({
      path: t.type({
        templateId: t.string,
      }),
    }),
    element: <UxReportViewPage />,
  },
  '/session-replay/settings': {
    element: <SessionReplaySettingsPage />,
  },
  '/session-replay/{sessionId}': {
    params: t.type({
      path: t.type({
        sessionId: t.string,
      }),
    }),
    element: <SessionDetailPage />,
  },
  '/session-replay/{sessionId}/replay': {
    params: t.type({
      path: t.type({
        sessionId: t.string,
      }),
    }),
    element: <SessionPlayerPage />,
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
                  <DatePickerContextProvider>
                    <InspectorContextProvider>
                      <UrlParamsProvider>
                        <CsmSharedContextProvider>
                          <RouteRenderer />
                        </CsmSharedContextProvider>
                      </UrlParamsProvider>
                    </InspectorContextProvider>
                  </DatePickerContextProvider>
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
