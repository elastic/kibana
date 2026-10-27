/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { EuiBetaBadge, EuiPageSection, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { Redirect, useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import { ENTITY_INVENTORY_PAGES, ENTITY_INVENTORY_TITLE } from '../pages';
import type { EntityInventoryAppStartDependencies, EntityInventoryEntityType } from '../types';
import { EntityInventoryPageShell } from './components/entity_inventory_page_shell';
import { ENTITY_LIST_PLACEHOLDER } from './translations';

const DEFAULT_PAGE_PATH = ENTITY_INVENTORY_PAGES[0].path;

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

const EntityInventoryPage = ({ entityType }: { entityType: EntityInventoryEntityType }) => (
  <EntityInventoryPageShell entityType={entityType}>
    <EuiText color="subdued" data-test-subj="entityInventoryPlaceholder">
      <p>{ENTITY_LIST_PLACEHOLDER}</p>
    </EuiText>
  </EntityInventoryPageShell>
);

export interface EntityInventoryAppProps {
  core: CoreStart;
  plugins: EntityInventoryAppStartDependencies;
}

/** Routed entity inventory app. Must render inside a `Router`. */
export const EntityInventoryApp = ({ core, plugins }: EntityInventoryAppProps) => {
  const services = useMemo(() => ({ ...core, ...plugins }), [core, plugins]);
  const { PageTemplate } = plugins.observabilityShared.navigation;
  const { pathname } = useLocation();
  const title =
    ENTITY_INVENTORY_PAGES.find((page) => page.path === pathname)?.title ?? ENTITY_INVENTORY_TITLE;

  return (
    <KibanaContextProvider services={services}>
      <PageTemplate isPageDataLoaded={true} pageSectionProps={{ paddingSize: 'none' }}>
        <AppHeader title={title} badges={TECH_PREVIEW_BADGE} menu={{}} spacing="standard" />
        <EuiPageSection paddingSize="m" grow restrictWidth={false}>
          <Routes>
            {ENTITY_INVENTORY_PAGES.map(({ entityType, path }) => (
              <Route
                key={path}
                path={path}
                render={() => <EntityInventoryPage entityType={entityType} />}
              />
            ))}
            <Redirect from="/" to={DEFAULT_PAGE_PATH} />
          </Routes>
        </EuiPageSection>
      </PageTemplate>
    </KibanaContextProvider>
  );
};

export const renderApp = (
  core: CoreStart,
  plugins: EntityInventoryAppStartDependencies,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    core.rendering.addContext(
      <Router history={history}>
        <EntityInventoryApp core={core} plugins={plugins} />
      </Router>
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
