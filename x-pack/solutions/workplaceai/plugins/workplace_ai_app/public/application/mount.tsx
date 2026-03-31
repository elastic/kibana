/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import { createRoot } from 'react-dom/client';
import type { WorkplaceAIServices } from '../services';
import type { WorkplaceAIAppPluginStartDependencies } from '../types';
import { WorkplaceAIAppRoutes } from './routes';

export const mountApp = async ({
  core,
  plugins,
  services,
  element,
  history,
}: {
  core: CoreStart;
  plugins: WorkplaceAIAppPluginStartDependencies;
  services: WorkplaceAIServices;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  const kibanaServices = { ...core, plugins, workplaceAIServices: services };
  const queryClient = new QueryClient();
  const root = createRoot(element);
  root.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <RedirectAppLinks coreStart={core}>
              <Router history={history}>
                <WorkplaceAIAppRoutes />
              </Router>
            </RedirectAppLinks>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );

  return () => root.unmount();
};
