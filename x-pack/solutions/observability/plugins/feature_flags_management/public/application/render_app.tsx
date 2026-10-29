/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { FeatureFlagsApp } from './app';
import { AppServicesProvider } from './app_services';

export const renderApp = (core: CoreStart, { element, history }: AppMountParameters) => {
  ReactDOM.render(
    core.rendering.addContext(
      <Router history={history}>
        <AppServicesProvider
          http={core.http}
          notifications={core.notifications}
          capabilities={core.application.capabilities}
        >
          <FeatureFlagsApp />
        </AppServicesProvider>
      </Router>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
