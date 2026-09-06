/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import { SdlcApiProvider } from './context/sdlc_api_context';
import { SdlcIntelApp } from './components/app';

export const renderApp = (coreStart: CoreStart, { element, history }: AppMountParameters) => {
  element.classList.add(APP_WRAPPER_CLASS);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <SdlcApiProvider http={coreStart.http}>
        <Router history={history}>
          <RedirectAppLinks coreStart={coreStart}>
            <SdlcIntelApp coreStart={coreStart} />
          </RedirectAppLinks>
        </Router>
      </SdlcApiProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
