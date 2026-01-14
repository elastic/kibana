/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { PluginContext } from '../context/plugin_context';
import type { KubernetesPocPluginStartDeps } from '../types';
import { ClusterListingPage } from './pages/cluster_listing';
import { OverviewPage } from './pages/overview';

interface RenderAppProps {
  core: CoreStart;
  plugins: KubernetesPocPluginStartDeps;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}

const KubernetesPocApp: React.FC<{ history: AppMountParameters['history'] }> = ({ history }) => {
  return (
    <Router history={history}>
      <Routes>
        <Route path="/clusters" component={ClusterListingPage} />
        <Route path="/overview" component={OverviewPage} />
        <Route path="/" exact component={ClusterListingPage} />
      </Routes>
    </Router>
  );
};

export const renderApp = ({
  core,
  plugins,
  appMountParameters,
  ObservabilityPageTemplate,
}: RenderAppProps) => {
  const { element, history } = appMountParameters;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <PluginContext.Provider value={{ core, plugins, ObservabilityPageTemplate }}>
        <KubernetesPocApp history={history} />
      </PluginContext.Provider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
