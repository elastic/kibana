/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { EuiBetaBadge, EuiPageSection, EuiText } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { Redirect, useLocation } from 'react-router-dom';
import type { EntityInventoryAppStartDependencies, EntityInventoryEntityType } from '../types';
import { EntityInventoryPageShell } from './components/entity_inventory_page_shell';
import { DEFAULT_ENTITY_PAGE_PATH, ENTITY_PAGES } from './constants';
import {
  ENTITY_INVENTORY_TITLE,
  ENTITY_LIST_PLACEHOLDER,
  ENTITY_PAGE_TITLES,
  TECH_PREVIEW_BADGE_LABEL,
  TECH_PREVIEW_BADGE_TOOLTIP,
} from './translations';

const TECH_PREVIEW_BADGES: AppHeaderBadge[] = [
  {
    label: TECH_PREVIEW_BADGE_LABEL,
    renderCustomBadge: () => (
      <EuiBetaBadge
        label={TECH_PREVIEW_BADGE_LABEL}
        color="hollow"
        size="s"
        iconType="flask"
        tooltipContent={TECH_PREVIEW_BADGE_TOOLTIP}
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
  const currentPage = ENTITY_PAGES.find(({ path }) => path === pathname);
  const title = currentPage ? ENTITY_PAGE_TITLES[currentPage.entityType] : ENTITY_INVENTORY_TITLE;

  return (
    <KibanaContextProvider services={services}>
      <PageTemplate isPageDataLoaded={true} pageSectionProps={{ paddingSize: 'none' }}>
        <AppHeader title={title} badges={TECH_PREVIEW_BADGES} menu={{}} spacing="standard" />
        <EuiPageSection paddingSize="m" grow restrictWidth={false}>
          <Routes>
            {ENTITY_PAGES.map(({ entityType, path }) => (
              <Route
                key={path}
                path={path}
                render={() => <EntityInventoryPage entityType={entityType} />}
              />
            ))}
            <Redirect from="/" to={DEFAULT_ENTITY_PAGE_PATH} />
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
