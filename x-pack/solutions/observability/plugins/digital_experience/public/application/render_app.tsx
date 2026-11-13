/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { RouteBreadcrumbsContextProvider } from '../breadcrumbs/route_breadcrumbs_context';
import { digitalExperienceRouter } from '../routes';
import type { DigitalExperienceStartDeps } from '../types';
import { SideNavProvider, useIsSideNavHidden } from './side_nav_context';

const router = digitalExperienceRouter as unknown as ComponentProps<
  typeof RouterProvider
>['router'];

/** The Observability page template, without its navigation when a page asks for the width. */
function AppPageTemplate({
  PageTemplate,
}: {
  PageTemplate: DigitalExperienceStartDeps['observabilityShared']['navigation']['PageTemplate'];
}) {
  const isSideNavHidden = useIsSideNavHidden();
  return (
    // Unpadded, so each page's AppHeader spans the page; pages pad their own content.
    <PageTemplate pageSectionProps={{ paddingSize: 'none' }} showSolutionNav={!isSideNavHidden}>
      <RouteRenderer />
    </PageTemplate>
  );
}

export const renderApp = ({
  core,
  pluginsStart,
  appMountParameters,
}: {
  core: CoreStart;
  pluginsStart: DigitalExperienceStartDeps;
  appMountParameters: AppMountParameters;
}) => {
  const { element, history } = appMountParameters;
  const { PageTemplate } = pluginsStart.observabilityShared.navigation;

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={{ ...core, ...pluginsStart }}>
        <RouterProvider history={history} router={router}>
          <div className={APP_WRAPPER_CLASS} data-test-subj="digitalExperienceMainContainer">
            {/* In-app links (getUrlForApp hrefs) navigate through the app's history instead of
            reloading Kibana. */}
            <RedirectAppLinks coreStart={{ application: core.application }}>
              {/* Outside the template's error boundary, so an invalid URL param reaches the
              router's boundary, which removes it from the URL. */}
              <RouteBreadcrumbsContextProvider>
                <SideNavProvider>
                  <AppPageTemplate PageTemplate={PageTemplate} />
                </SideNavProvider>
              </RouteBreadcrumbsContextProvider>
            </RedirectAppLinks>
          </div>
        </RouterProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    // The embedded Classic RUM dashboard starts a search session, which the app must clear on leave.
    pluginsStart.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
