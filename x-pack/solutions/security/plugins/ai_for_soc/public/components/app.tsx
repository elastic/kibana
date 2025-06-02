/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { StartServices } from '../types';

interface RenderAppProps extends AppMountParameters {
  services: StartServices;
  usageCollection?: unknown;
}

interface AppProps {
  services: StartServices;
  theme$: AppMountParameters['theme$'];
}

const AppComponent: React.FC<AppProps> = ({ services }) => {
  const isDarkMode = useKibanaIsDarkMode();

  return (
    <KibanaContextProvider services={services}>
      <EuiThemeProvider darkMode={isDarkMode}>
        <div>AI for SOC App</div>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
};

const App = React.memo(AppComponent);

export const renderApp = ({ element, services, theme$ }: RenderAppProps): (() => void) => {
  render(<App services={services} theme$={theme$} />, element);

  return () => unmountComponentAtNode(element);
};
