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
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkplaceAIConnectorsRoutes } from './routes';
import type {
  WorkplaceAIConnectorsPluginStart,
  WorkplaceAIConnectorsPluginStartDependencies,
} from '../types';

export interface WorkplaceAIConnectorsMountParams {
  core: CoreStart;
  plugins: WorkplaceAIConnectorsPluginStartDependencies;
  services: WorkplaceAIConnectorsPluginStart;
  params: AppMountParameters;
}

export const renderApp = ({
  core,
  plugins,
  services,
  params,
}: WorkplaceAIConnectorsMountParams) => {
  const kibanaServices = { ...core, plugins, services, appParams: { history: params.history } };
  const { element } = params;
  ReactDOM.render(
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <Router history={params.history}>
          <WorkplaceAIConnectorsRoutes />
        </Router>
      </I18nProvider>
    </KibanaContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
