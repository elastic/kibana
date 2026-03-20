/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ElasticAssistantPublicPluginStartDependencies } from '../types';
import { KibanaContextProvider } from './context/typed_kibana_context/typed_kibana_context';
import { ReactQueryClientProvider } from './context/query_client_context/elastic_assistant_query_client_provider';
import { PipelineDashboard } from './components/pipeline_dashboard/pipeline_dashboard';

export const renderPipelineDashboard = (
  coreStart: CoreStart,
  dependencies: ElasticAssistantPublicPluginStartDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'alertInvestigationPipeline',
          ...coreStart,
          ...dependencies,
        }}
      >
        <KibanaThemeProvider {...coreStart}>
          <ReactQueryClientProvider>
            <PipelineDashboard />
          </ReactQueryClientProvider>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
