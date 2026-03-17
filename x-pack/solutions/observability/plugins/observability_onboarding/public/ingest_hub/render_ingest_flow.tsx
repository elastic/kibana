/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { createMemoryHistory } from 'history';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { Router } from '@kbn/shared-ux-router';
import type { AppContext, ConfigSchema, ObservabilityOnboardingAppServices } from '..';
import type { ObservabilityOnboardingPluginStartDeps } from '../plugin';
import { createCallApi } from '../services/rest/create_call_api';

export interface IngestFlowDeps {
  core: CoreStart;
  plugins: ObservabilityOnboardingPluginStartDeps;
  config: ConfigSchema;
  context: AppContext;
}

export const mountKubernetesFlow = async (
  element: HTMLElement,
  deps: IngestFlowDeps
): Promise<() => void> => {
  const { KubernetesPanel } = await import('../application/quickstart_flows/kubernetes');
  return renderIngestFlow(element, deps, <KubernetesPanel />);
};

export const renderIngestFlow = (
  element: HTMLElement,
  deps: IngestFlowDeps,
  content: React.ReactNode
): (() => void) => {
  createCallApi(deps.core);

  const services: ObservabilityOnboardingAppServices = {
    ...deps.core,
    ...deps.plugins,
    config: deps.config,
    context: deps.context,
  };

  ReactDOM.render(
    deps.core.rendering.addContext(
      <KibanaContextProvider services={services}>
        <Router history={createMemoryHistory()}>
          <PerformanceContextProvider>
            <>{content}</>
          </PerformanceContextProvider>
        </Router>
      </KibanaContextProvider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
