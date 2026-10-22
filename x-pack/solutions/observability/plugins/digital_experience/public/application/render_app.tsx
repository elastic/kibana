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
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { RouteBreadcrumbsContextProvider } from '../breadcrumbs/route_breadcrumbs_context';
import { digitalExperienceRouter } from '../routes';
import type { DigitalExperienceStartDeps } from '../types';

const router = digitalExperienceRouter as unknown as ComponentProps<
  typeof RouterProvider
>['router'];

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
            <PageTemplate>
              <RouteBreadcrumbsContextProvider>
                <RouteRenderer />
              </RouteBreadcrumbsContextProvider>
            </PageTemplate>
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
