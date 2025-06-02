/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppPluginStartDependencies } from './types';
import { QueryRulesetDetailsForm } from './providers/query_ruleset_details_form';

const queryClient = new QueryClient({});
export const renderApp = async (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement
) => {
  const { QueryRulesRouter } = await import('./search_query_router');

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <QueryRulesetDetailsForm>
            <QueryClientProvider client={queryClient}>
              <Router history={services.history}>
                <QueryRulesRouter />
              </Router>
            </QueryClientProvider>
          </QueryRulesetDetailsForm>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
