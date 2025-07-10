/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';
import { FACETS_MAX_WIDTH_PX, INTEGRATIONS_GRID_MAX_WIDTH_PX } from './constants';
import { IntegrationViewFacets } from './view_facets';
import { IntegrationsFacets } from '../../../constants';

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

export interface IntegrationsGridProps {
  view: IntegrationsFacets;
  availableIntegrations: IntegrationCardItem[];
  installedIntegrations: IntegrationCardItem[];
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}

export const IntegrationsPage = React.memo<IntegrationsGridProps>(
  ({ view, availableIntegrations, installedIntegrations, searchTerm, setSearchTerm }) => {
    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem
            css={css`
              max-width: ${FACETS_MAX_WIDTH_PX}px;
            `}
          >
            <IntegrationViewFacets
              allCount={availableIntegrations.length}
              installedCount={installedIntegrations.length}
              selectedFacet={view}
            />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              max-width: ${INTEGRATIONS_GRID_MAX_WIDTH_PX}px;
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
              selectedCategory={'security'}
              selectedSubCategory={''}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setCategory={noop}
              setUrlandPushHistory={noop}
              setUrlandReplaceHistory={noop}
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
IntegrationsPage.displayName = 'IntegrationsGrid';
