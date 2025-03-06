/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import type { WorkChatServices } from '../services';
import { WorkchatChatPage } from './pages/chat';
import { WorkChatServicesContext } from './context/workchat_services_context';
import type { WorkChatAppPluginStartDependencies } from '../types';

export const mountApp = async ({
  core,
  plugins,
  services,
  element,
  history,
}: {
  core: CoreStart;
  plugins: WorkChatAppPluginStartDependencies;
  services: WorkChatServices;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  const kibanaServices = { ...core, plugins };
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <WorkChatServicesContext.Provider value={services}>
            <Router history={history}>
              <Routes>
                <Route path="/chat/:conversationId">
                  <WorkchatChatPage />
                </Route>
                <Route path="/">
                  <WorkchatChatPage />
                </Route>
              </Routes>
            </Router>
          </WorkChatServicesContext.Provider>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
