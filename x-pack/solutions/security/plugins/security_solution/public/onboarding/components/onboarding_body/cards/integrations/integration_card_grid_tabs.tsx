/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  COLOR_MODES_STANDARD,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';

import { css } from '@emotion/react';
import { withLazyHook } from '../../../../../common/components/with_lazy_hook';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../onboarding_context';
import {
  DEFAULT_TAB,
  LOADING_SKELETON_TEXT_LINES,
  SCROLL_ELEMENT_ID,
  SEARCH_FILTER_CATEGORIES,
  TELEMETRY_INTEGRATION_TAB,
  WITHOUT_SEARCH_BOX_HEIGHT,
  WITH_SEARCH_BOX_HEIGHT,
} from './constants';
import { INTEGRATION_TABS, INTEGRATION_TABS_BY_ID } from './integration_tabs_configs';
import { useIntegrationCardList } from './use_integration_card_list';
import { IntegrationTabId } from './types';
import { IntegrationCardTopCallout } from './callouts/integration_card_top_callout';
import { trackOnboardingLinkClick } from '../../../lib/telemetry';
import { useIntegrationCardGridTabsStyles } from './integration_card_grid_tabs.styles';

export interface IntegrationsCardGridTabsProps {
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
  useAvailablePackages: AvailablePackagesHookType;
}

const emptyStateStyles = { paddingTop: '16px' };

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

export const IntegrationsCardGridTabsComponent = React.memo<IntegrationsCardGridTabsProps>(
  ({ installedIntegrationsCount, isAgentRequired, useAvailablePackages }) => {
    const { spaceId } = useOnboardingContext();
    const scrollElement = useRef<HTMLDivElement>(null);
    const { colorMode } = useEuiTheme();
    const isDark = colorMode === COLOR_MODES_STANDARD.dark;
    const [toggleIdSelected, setSelectedTabIdToStorage] = useStoredIntegrationTabId(
      spaceId,
      DEFAULT_TAB.id
    );
    const [searchTermFromStorage, setSearchTermToStorage] = useStoredIntegrationSearchTerm(spaceId);
    const onTabChange = useCallback(
      (stringId: string) => {
        const id = stringId as IntegrationTabId;
        const trackId = `${TELEMETRY_INTEGRATION_TAB}_${id}`;
        scrollElement.current?.scrollTo?.(0, 0);
        setSelectedTabIdToStorage(id);
        trackOnboardingLinkClick(trackId);
      },
      [setSelectedTabIdToStorage]
    );

    const {
      filteredCards,
      isLoading,
      searchTerm,
      setCategory,
      setSearchTerm,
      setSelectedSubCategory,
    } = useAvailablePackages({
      prereleaseIntegrationsEnabled: false,
    });

    const selectedTab = useMemo(() => INTEGRATION_TABS_BY_ID[toggleIdSelected], [toggleIdSelected]);

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

    const list: IntegrationCardItem[] = useIntegrationCardList({
      integrationsList: filteredCards,
      featuredCardIds: selectedTab.featuredCardIds,
    });

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
          height: ${selectedTab.showSearchTools
            ? WITH_SEARCH_BOX_HEIGHT
            : WITHOUT_SEARCH_BOX_HEIGHT};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            css={isDark ? buttonGroupStyles : undefined}
            buttonSize="compressed"
            color="primary"
            idSelected={toggleIdSelected}
            isFullWidth
            legend="Categories"
            onChange={onTabChange}
            options={INTEGRATION_TABS}
            type="single"
          />
        </EuiFlexItem>
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
                <IntegrationCardTopCallout
                  isAgentRequired={isAgentRequired}
                  installedIntegrationsCount={installedIntegrationsCount}
                  selectedTabId={toggleIdSelected}
                />
              }
              calloutTopSpacerSize="m"
              categories={SEARCH_FILTER_CATEGORIES} // We do not want to show categories and subcategories as the search bar filter
              emptyStateStyles={emptyStateStyles}
              list={list}
              scrollElementId={SCROLL_ELEMENT_ID}
              searchTerm={searchTerm}
              selectedCategory={selectedTab.category ?? ''}
              selectedSubCategory={selectedTab.subCategory}
              setCategory={setCategory}
              setSearchTerm={onSearchTermChanged}
              setUrlandPushHistory={noop}
              setUrlandReplaceHistory={noop}
              showCardLabels={false}
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

export const IntegrationsCardGridTabs = withLazyHook(
  IntegrationsCardGridTabsComponent,
  () => import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook()),
  <EuiSkeletonText
    data-test-subj="loadingPackages"
    isLoading={true}
    lines={LOADING_SKELETON_TEXT_LINES}
  />
);
IntegrationsCardGridTabs.displayName = 'IntegrationsCardGridTabs';
