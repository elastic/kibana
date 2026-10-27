/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiBetaBadge, EuiPageSection } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { Redirect, useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ENTITY_INVENTORY_PAGES } from '../pages';

interface EntityInventoryShellProps {
  PageTemplate: ObservabilitySharedPluginStart['navigation']['PageTemplate'];
}

const techPreviewLabel = i18n.translate('xpack.entityInventoryApp.techPreviewBadgeLabel', {
  defaultMessage: 'Technical preview',
});

const TECH_PREVIEW_BADGE: AppHeaderBadge[] = [
  {
    label: techPreviewLabel,
    renderCustomBadge: () => (
      <EuiBetaBadge
        label={techPreviewLabel}
        color="hollow"
        size="s"
        iconType="flask"
        tooltipContent={i18n.translate('xpack.entityInventoryApp.techPreviewBadgeTooltip', {
          defaultMessage:
            'This functionality is in technical preview and may be changed or removed in a future release.',
        })}
      />
    ),
  },
];

function EntityInventoryShell({ PageTemplate }: EntityInventoryShellProps) {
  const { pathname } = useLocation();
  const title =
    ENTITY_INVENTORY_PAGES.find((page) => page.path === pathname)?.title ??
    i18n.translate('xpack.entityInventoryApp.entityInventoryTitle', {
      defaultMessage: 'Entity Inventory',
    });

  return (
    <PageTemplate isPageDataLoaded={true} pageSectionProps={{ paddingSize: 'none' }}>
      <AppHeader title={title} badges={TECH_PREVIEW_BADGE} menu={{}} spacing="standard" />
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
