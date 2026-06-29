/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router } from '@kbn/shared-ux-router';
import type { DataFabricPluginStartDeps } from '../types';
import { DataFabricApp } from './data_fabric_app';

export const renderApp = (
  core: CoreStart,
  plugins: DataFabricPluginStartDeps,
  appMountParameters: AppMountParameters
): (() => void) => {
  const { element, history, theme$ } = appMountParameters;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core} theme={{ theme$ }}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <Router history={history}>
          <DataFabricApp />
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
