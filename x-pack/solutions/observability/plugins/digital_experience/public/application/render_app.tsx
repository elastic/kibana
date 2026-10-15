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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { digitalExperienceRouter } from '../routes';
import type { DigitalExperienceStartDeps } from '../types';

// The concrete router's `matchRoutes` tuple type is narrower than the generic `RouteMap` one.
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
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...pluginsStart }}>
        <RouterProvider history={history} router={router}>
          <div className={APP_WRAPPER_CLASS} data-test-subj="digitalExperienceMainContainer">
            <PageTemplate>
              <RouteRenderer />
            </PageTemplate>
          </div>
        </RouterProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
