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
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { StartServices } from '../hooks/use_kibana';
import { ENTITY_INVENTORY_PAGES, ENTITY_INVENTORY_TITLE } from '../pages';
import type { EntityInventoryAppStartDependencies } from '../types';
import { entityInventoryRouter } from '../routes/config';

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

export function EntityInventoryShell({ PageTemplate }: EntityInventoryShellProps) {
  const { pathname } = useLocation();
  const currentPage = ENTITY_INVENTORY_PAGES.find((page) => page.path === pathname);
  const title = currentPage?.title ?? ENTITY_INVENTORY_TITLE;

  return (
    <PageTemplate isPageDataLoaded={true} pageSectionProps={{ paddingSize: 'none' }}>
      <AppHeader title={title} badges={TECH_PREVIEW_BADGE} menu={{}} spacing="standard" />
      <EuiPageSection paddingSize="m" grow restrictWidth={false}>
        <RouteRenderer />
      </EuiPageSection>
    </PageTemplate>
  );
}

export function renderApp(
  core: CoreStart,
  plugins: EntityInventoryAppStartDependencies,
  { element, history }: AppMountParameters
) {
  const { PageTemplate } = plugins.observabilityShared.navigation;

  const services: StartServices = { ...core, ...plugins };

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={services}>
        <RouterProvider history={history} router={entityInventoryRouter}>
          <EntityInventoryShell PageTemplate={PageTemplate} />
        </RouterProvider>
      </KibanaContextProvider>
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}
