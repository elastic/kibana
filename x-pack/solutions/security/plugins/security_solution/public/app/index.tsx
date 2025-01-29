/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SecurityApp } from './app';
import type { RenderAppProps } from './types';
import { AppRoutes } from './app_routes';

export const renderApp = ({
  element,
  history,
  services,
  store,
  usageCollection,
  subPluginRoutes,
  theme$,
  children,
}: RenderAppProps): (() => void) => {
  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  render(
    <SecurityApp history={history} services={services} store={store} theme$={theme$}>
      <ApplicationUsageTrackingProvider>
        {children ??
          (subPluginRoutes && <AppRoutes subPluginRoutes={subPluginRoutes} services={services} />)}
      </ApplicationUsageTrackingProvider>
    </SecurityApp>,
    element
  );
  return () => {
    services.data.search.session.clear();
    unmountComponentAtNode(element);
  };
};
