/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { EntitiesRuntimeCaueStartDependencies } from '../types';
import { App } from '../components/app';

const queryClient = new QueryClient();

export const renderApp = ({
  appMountParameters,
  coreStart,
  pluginsStart,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: EntitiesRuntimeCaueStartDependencies;
}) => {
  const { element } = appMountParameters;

  ReactDOM.render(
    coreStart.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <App
          http={coreStart.http}
          dataViews={pluginsStart.data.dataViews}
          SearchBar={pluginsStart.unifiedSearch.ui.SearchBar}
        />
      </QueryClientProvider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
