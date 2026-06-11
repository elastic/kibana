/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AppRoutes } from './routes';

export const renderApp = (
  coreStart: CoreStart,
  { history, element, theme$ }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider services={coreStart}>
        <AppRoutes history={history} />
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
