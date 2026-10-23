/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiPageSection } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { Redirect, useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';

interface EntityInventoryShellProps {
  PageTemplate: ObservabilitySharedPluginStart['navigation']['PageTemplate'];
}

const PATH_TITLES: Record<string, string> = {
  '/all-resources': 'All resources',
  '/hosts': 'Hosts',
  '/kubernetes': 'Kubernetes',
};

function EntityInventoryShell({ PageTemplate }: EntityInventoryShellProps) {
  const { pathname } = useLocation();
  const title = PATH_TITLES[pathname] ?? 'Entity Inventory';

  return (
    <PageTemplate isPageDataLoaded={true} pageSectionProps={{ paddingSize: 'none' }}>
      <AppHeader title={title} menu={{}} spacing="standard" />
      <EuiPageSection paddingSize="m" grow restrictWidth={false}>
        <Routes>
          <Route path="/all-resources" component={EntityInventoryContent} />
          <Route path="/hosts" component={EntityInventoryContent} />
          <Route path="/kubernetes" component={EntityInventoryContent} />
          <Redirect from="/" to="/all-resources" />
        </Routes>
      </EuiPageSection>
    </PageTemplate>
  );
}

function EntityInventoryContent() {
  return (
    <>
      <br />
      <h1>Entity Inventory content here.</h1>
    </>
  );
}

export function renderApp(
  core: CoreStart,
  observabilityShared: ObservabilitySharedPluginStart,
  { element, history }: AppMountParameters
) {
  const { PageTemplate } = observabilityShared.navigation;

  ReactDOM.render(
    core.rendering.addContext(
      <Router history={history}>
        <EntityInventoryShell PageTemplate={PageTemplate} />
      </Router>
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}
