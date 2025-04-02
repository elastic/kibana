/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { installationStatuses } from '@kbn/fleet-plugin/public';
import { withLazyHook } from '../../../../common/components/with_lazy_hook';
import { AVAILABLE_INTEGRATIONS, LOADING_SKELETON_TEXT_LINES } from './constants';
import { useEnhancedIntegrationCards } from './use_enhanced_integration_cards';
import { PackageListGrid } from './common';
import { IntegrationViewFacets } from './view_facets';
import { IntegrationsFacets } from '../../../constants';

export interface IntegrationsPageProps {
  useAvailablePackages: AvailablePackagesHookType;
}

export const AvailableIntegrationsPage = React.memo<IntegrationsPageProps>(
  ({ useAvailablePackages }) => {
    const { filteredCards, isLoading, searchTerm, setSearchTerm } = useAvailablePackages({
      prereleaseIntegrationsEnabled: true,
    });

    const installed = filteredCards.filter(
      (card) =>
        card.installStatus === installationStatuses.Installed ||
        card.installStatus === installationStatuses.InstallFailed
    );

    const availableIntegrations = filteredCards.filter((card) =>
      AVAILABLE_INTEGRATIONS.includes(card.name)
    );

    const gridList: IntegrationCardItem[] = useEnhancedIntegrationCards(
      availableIntegrations,
      IntegrationsFacets.available
    );

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
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <IntegrationViewFacets
            allCount={AVAILABLE_INTEGRATIONS.length}
            installedCount={installed.length}
            selectedFacet={IntegrationsFacets.available}
          />
          <EuiFlexItem
            css={css`
              max-width: 1200px;
            `}
          >
            <PackageListGrid
              calloutTopSpacerSize="m"
              categories={[]} // We do not want to show categories and subcategories as the search bar filter
              emptyStateStyles={{ paddingTop: '16px' }}
              list={gridList}
              scrollElementId={'integrations-scroll-container'}
              searchTerm={searchTerm}
              selectedCategory={'security'}
              selectedSubCategory={''}
              setCategory={() => {}}
              setSearchTerm={setSearchTerm}
              setUrlandPushHistory={() => {}}
              setUrlandReplaceHistory={() => {}}
              showCardLabels={true}
              showControls={false}
              showSearchTools={true}
              sortByFeaturedIntegrations={false}
              spacer={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }
);
AvailableIntegrationsPage.displayName = 'AvailableIntegrationsPage';

export const IntegrationsAllView = withLazyHook(AvailableIntegrationsPage, () =>
  import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook())
);
IntegrationsAllView.displayName = 'AvailableIntegrationsView';
