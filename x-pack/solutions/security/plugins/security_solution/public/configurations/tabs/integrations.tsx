/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonLoading } from '@elastic/eui';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { SEARCH_AI_LAKE_PACKAGES } from '@kbn/fleet-plugin/common';
import { useGetPackageVerificationKeyId } from '@kbn/fleet-plugin/public/hooks';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { useEnhancedIntegrationCards } from '../../common/lib/search_ai_lake/hooks';
import { ConfigurationTabs, IntegrationsFacets } from '../constants';
import { IntegrationsPage, IntegrationsSkeleton } from './integrations/components';
import { withLazyHook } from '../../common/components/with_lazy_hook';

export interface IntegrationsPageProps {
  useAvailablePackages: AvailablePackagesHookType;
}

export const ConfigurationsIntegrationsHome = React.memo<IntegrationsPageProps>(
  ({ useAvailablePackages }) => {
    useGetPackageVerificationKeyId();

    const { filteredCards, isLoading, searchTerm, setSearchTerm } = useAvailablePackages({
      prereleaseIntegrationsEnabled: true,
    });

    const allowedIntegrations = filteredCards.filter((card) =>
      SEARCH_AI_LAKE_PACKAGES.includes(card.name)
    );

    const { available, installed } = useEnhancedIntegrationCards(allowedIntegrations);

    return (
      <EuiSkeletonLoading
        isLoading={isLoading}
        loadingContent={<IntegrationsSkeleton />}
        loadedContent={
          <>
            <Routes>
              <Route
                path={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}/:view(${IntegrationsFacets.available})`}
              >
                <IntegrationsPage
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
          </>
        }
      />
    );
  }
);
ConfigurationsIntegrationsHome.displayName = 'ConfigurationsIntegrationsHome';

export const LazyConfigurationsIntegrationsHome = withLazyHook(ConfigurationsIntegrationsHome, () =>
  import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook())
);
LazyConfigurationsIntegrationsHome.displayName = 'LazyConfigurationsIntegrationsHome';
