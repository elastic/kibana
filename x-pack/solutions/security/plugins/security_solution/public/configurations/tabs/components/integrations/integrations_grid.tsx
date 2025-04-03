/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { LOADING_SKELETON_TEXT_LINES } from './constants';
import { IntegrationViewFacets } from './view_facets';
import { IntegrationsFacets } from '../../../constants';

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

export interface IntegrationsPageProps {
  isLoading: boolean;
  view: IntegrationsFacets;
  availableIntegrations: IntegrationCardItem[];
  installedIntegrations: IntegrationCardItem[];
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}

export const IntegrationsPage = React.memo<IntegrationsPageProps>(
  ({
    isLoading,
    view,
    availableIntegrations,
    installedIntegrations,
    searchTerm,
    setSearchTerm,
  }) => {
    if (isLoading) {
      return (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiSpacer size="l" />
          <EuiSkeletonText
            data-test-subj="loadingIntegrations"
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
            allCount={availableIntegrations.length}
            installedCount={installedIntegrations.length}
            selectedFacet={view}
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
              list={
                view === IntegrationsFacets.available
                  ? availableIntegrations
                  : view === IntegrationsFacets.installed
                  ? installedIntegrations
                  : []
              }
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
IntegrationsPage.displayName = 'IntegrationsPage';
