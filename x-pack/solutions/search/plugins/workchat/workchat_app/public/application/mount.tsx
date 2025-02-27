/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { Route, Router } from '@kbn/shared-ux-router';
import { WorkchatChatPage } from './pages/chat';

export const mountApp = async ({
  core,
  element,
  history,
}: {
  core: CoreStart;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <I18nProvider>
        <Router history={history}>
          <Route path="/">
            <WorkchatChatPage />
          </Route>
        </Router>
      </I18nProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
