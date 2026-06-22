/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ErrorSentryPublicStartDeps } from './plugin';
import { Page } from './components/page';

const queryClient = new QueryClient();

export const renderApp = (
  core: CoreStart,
  { element }: AppMountParameters,
  startPlugins: ErrorSentryPublicStartDeps
): (() => void) => {
  ReactDOM.render(
    core.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <Page
          http={core.http}
          notifications={core.notifications}
          discover={startPlugins.discover}
        />
      </QueryClientProvider>
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
