/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import {
  COLOR_MODES_STANDARD,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';

import { css } from '@emotion/react';
import { useIntegrationCardGridTabsStyles } from '../hooks/integration_card_grid_tabs.styles';
import {
  DEFAULT_INTEGRATION_CARD_CONTENT_HEIGHT,
  LOADING_SKELETON_TEXT_LINES,
  SCROLL_ELEMENT_ID,
  SEARCH_FILTER_CATEGORIES,
  TELEMETRY_INTEGRATION_TAB,
} from '../constants';
import type { AvailablePackagesResult } from '../types';
import { IntegrationTabId } from '../types';
import type { UseSelectedTabReturn } from '../hooks/use_selected_tab';
import { useStoredIntegrationSearchTerm } from '../hooks/use_stored_state';
import { useIntegrationContext } from '../hooks/integration_context';

export interface IntegrationsCardGridTabsProps {
  installedIntegrationsCount: number;
  isAgentRequired?: boolean;
  availablePackagesResult: AvailablePackagesResult;
  topCalloutRenderer?: React.FC<{
    installedIntegrationsCount: number;
    isAgentRequired?: boolean;
    selectedTabId: IntegrationTabId;
  }>;
  integrationList: IntegrationCardItem[];
  selectedTabResult: UseSelectedTabReturn;
  packageListGridOptions?: {
    showCardLabels?: boolean;
  };
}

const emptyStateStyles = { paddingTop: '16px' };

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

// beware if local storage, need to add project id to the key
export const IntegrationsCardGridTabsComponent = React.memo<IntegrationsCardGridTabsProps>(
  ({
    isAgentRequired,
    installedIntegrationsCount,
    topCalloutRenderer: TopCallout,
    integrationList,
    availablePackagesResult,
    selectedTabResult,
    packageListGridOptions,
  }) => {
    const {
      spaceId,
      telemetry: { reportLinkClick },
    } = useIntegrationContext();
    const scrollElement = useRef<HTMLDivElement>(null);
    const { colorMode } = useEuiTheme();
    const isDark = colorMode === COLOR_MODES_STANDARD.dark;
    const { selectedTab, toggleIdSelected, setSelectedTabIdToStorage, integrationTabs } =
      selectedTabResult;
    const [searchTermFromStorage, setSearchTermToStorage] = useStoredIntegrationSearchTerm(spaceId);
    const onTabChange = useCallback(
      (stringId: string) => {
        const id = stringId as IntegrationTabId;
        const trackId = `${TELEMETRY_INTEGRATION_TAB}_${id}`;
        scrollElement.current?.scrollTo?.(0, 0);
        setSelectedTabIdToStorage(id);
        reportLinkClick?.(trackId);
      },
      [setSelectedTabIdToStorage, reportLinkClick]
    );

    const { isLoading, searchTerm, setCategory, setSearchTerm, setSelectedSubCategory } =
      availablePackagesResult;

    const buttonGroupStyles = useIntegrationCardGridTabsStyles();

    const onSearchTermChanged = useCallback(
      (searchQuery: string) => {
        setSearchTerm(searchQuery);
        // Search term is preserved across VISIBLE tabs
        // As we want user to be able to see the same search results when coming back from Fleet
        if (selectedTab.showSearchTools) {
          setSearchTermToStorage(searchQuery);
        }
      },
      [selectedTab.showSearchTools, setSearchTerm, setSearchTermToStorage]
    );

    useEffect(() => {
      setCategory(selectedTab.category ?? '');
      setSelectedSubCategory(selectedTab.subCategory);
      if (!selectedTab.showSearchTools) {
        // If search box are not shown, clear the search term to avoid unexpected filtering
        onSearchTermChanged('');
      }

      if (
        selectedTab.showSearchTools &&
        searchTermFromStorage &&
        toggleIdSelected !== IntegrationTabId.recommended
      ) {
        setSearchTerm(searchTermFromStorage);
      }
    }, [
      onSearchTermChanged,
      searchTermFromStorage,
      selectedTab.category,
      selectedTab.showSearchTools,
      selectedTab.subCategory,
      setCategory,
      setSearchTerm,
      setSelectedSubCategory,
      toggleIdSelected,
    ]);

    if (isLoading) {
      return (
        <EuiSkeletonText
          data-test-subj="loadingPackages"
          isLoading={true}
          lines={LOADING_SKELETON_TEXT_LINES}
        />
      );
    }
    return (
      <EuiFlexGroup
        direction="column"
        className="step-paragraph"
        gutterSize={selectedTab.showSearchTools ? 'm' : 'none'}
        css={css`
          height: ${selectedTab.height ?? DEFAULT_INTEGRATION_CARD_CONTENT_HEIGHT};
        `}
      >
        {integrationTabs.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              css={isDark ? buttonGroupStyles : undefined}
              buttonSize="compressed"
              color="primary"
              idSelected={toggleIdSelected}
              isFullWidth
              legend="Categories"
              onChange={onTabChange}
              options={integrationTabs}
              type="single"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            overflow-y: ${selectedTab.overflow ?? 'auto'};
          `}
          grow={1}
          id={SCROLL_ELEMENT_ID}
          ref={scrollElement}
        >
          <Suspense
            fallback={<EuiSkeletonText isLoading={true} lines={LOADING_SKELETON_TEXT_LINES} />}
          >
            <PackageListGrid
              callout={
                TopCallout ? (
                  <TopCallout
                    isAgentRequired={isAgentRequired}
                    installedIntegrationsCount={installedIntegrationsCount}
                    selectedTabId={selectedTab.id}
                  />
                ) : null
              }
              calloutTopSpacerSize="m"
              categories={SEARCH_FILTER_CATEGORIES} // We do not want to show categories and subcategories as the search bar filter
              emptyStateStyles={emptyStateStyles}
              list={integrationList}
              scrollElementId={SCROLL_ELEMENT_ID}
              searchTerm={searchTerm}
              selectedCategory={selectedTab.category ?? ''}
              selectedSubCategory={selectedTab.subCategory}
              setCategory={setCategory}
              setSearchTerm={onSearchTermChanged}
              setUrlandPushHistory={noop}
              setUrlandReplaceHistory={noop}
              showCardLabels={packageListGridOptions?.showCardLabels}
              showControls={false}
              showSearchTools={selectedTab.showSearchTools}
              sortByFeaturedIntegrations={selectedTab.sortByFeaturedIntegrations}
              spacer={false}
            />
          </Suspense>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
IntegrationsCardGridTabsComponent.displayName = 'IntegrationsCardGridTabsComponent';
