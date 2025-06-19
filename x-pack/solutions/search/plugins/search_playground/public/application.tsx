/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { AppPluginStartDependencies } from './types';
import { queryClient } from './utils/query_client';

export const renderApp = async (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement
) => {
  const { PlaygroundRouter } = await import('./playground_router');

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <Router history={services.history}>
            <QueryClientProvider client={queryClient}>
              <PlaygroundRouter />
            </QueryClientProvider>
          </Router>
        </I18nProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
