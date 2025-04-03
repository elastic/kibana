/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import {
  AVAILABLE_INTEGRATIONS,
  LOADING_SKELETON_TEXT_LINES,
} from './components/integrations/constants';
import { useEnhancedIntegrationCards } from './hooks/use_enhanced_integration_cards';
import { ConfigurationTabs, IntegrationsFacets } from '../constants';
import { IntegrationsPage } from './components';
import { withLazyHook } from '../../common/components/with_lazy_hook';

export interface IntegrationsPageProps {
  useAvailablePackages: AvailablePackagesHookType;
}

export const ConfigurationsIntegrationsHome = React.memo<IntegrationsPageProps>(
  ({ useAvailablePackages }) => {
    const { filteredCards, isLoading, searchTerm, setSearchTerm } = useAvailablePackages({
      prereleaseIntegrationsEnabled: true,
    });

    const allowedIntegrations = filteredCards.filter((card) =>
      AVAILABLE_INTEGRATIONS.includes(card.name)
    );

    const { available, installed } = useEnhancedIntegrationCards(allowedIntegrations);

    if (isLoading) {
      return (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiSpacer size="l" />
          <EuiSkeletonText
            data-test-subj="loadingPackages"
            isLoading={true}
            lines={LOADING_SKELETON_TEXT_LINES}
          />
        </EuiFlexGroup>
      );
    }

    return (
      <Routes>
        <Route
          path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/:view(${IntegrationsFacets.available})`}
        >
          <IntegrationsPage
            isLoading={isLoading}
            view={IntegrationsFacets.available}
            availableIntegrations={available}
            installedIntegrations={installed}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </Route>
        <Route
          path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/:view(${IntegrationsFacets.installed})`}
        >
          <IntegrationsPage
            isLoading={isLoading}
            view={IntegrationsFacets.installed}
            availableIntegrations={available}
            installedIntegrations={installed}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </Route>
        <Route
          path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`}
          render={() => (
            <Redirect
              to={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/${IntegrationsFacets.available}`}
            />
          )}
        />
      </Routes>
    );
  }
);
ConfigurationsIntegrationsHome.displayName = 'ConfigurationsIntegrationsHome';

export const LazyConfigurationsIntegrationsHome = withLazyHook(ConfigurationsIntegrationsHome, () =>
  import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook())
);
LazyConfigurationsIntegrationsHome.displayName = 'LazyConfigurationsIntegrationsHome';
