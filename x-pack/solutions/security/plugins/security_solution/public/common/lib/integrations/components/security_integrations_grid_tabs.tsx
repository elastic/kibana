/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
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
import type { TopCalloutRenderer } from '../types';
import { IntegrationTabId } from '../types';
import { useStoredIntegrationSearchTerm } from '../hooks/use_stored_state';
import { useIntegrationContext } from '../hooks/integration_context';
import type { AvailablePackages } from './with_available_packages';
import { useCreateAutoImportCard } from '../hooks/use_create_auto_import_card';
import type { UseSelectedTabReturn } from '../hooks/use_selected_tab';

export interface SecurityIntegrationsGridTabsProps {
  activeIntegrationsCount: number;
  isAgentRequired?: boolean;
  availablePackages: AvailablePackages;
  topCalloutRenderer?: TopCalloutRenderer;
  integrationList: IntegrationCardItem[];
  packageListGridOptions?: {
    showCardLabels?: boolean;
  };
  selectedTab: UseSelectedTabReturn['selectedTab'];
  setSelectedTabId?: UseSelectedTabReturn['setSelectedTabId'];
}

const emptyStateStyles = { paddingTop: '16px' };

export const PackageListGrid = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

// beware if local storage, need to add project id to the key
export const SecurityIntegrationsGridTabs = React.memo<SecurityIntegrationsGridTabsProps>(
  ({
    isAgentRequired,
    activeIntegrationsCount,
    topCalloutRenderer: TopCallout,
    integrationList,
    availablePackages,
    packageListGridOptions,
    setSelectedTabId,
    selectedTab,
  }) => {
    const {
      spaceId,
      telemetry: { reportLinkClick },
      integrationTabs,
    } = useIntegrationContext();
    const scrollElement = useRef<HTMLDivElement>(null);

    const createAutoImportCard = useCreateAutoImportCard();

    const integrationTabOptions = useMemo<EuiButtonGroupOptionProps[]>(
      () =>
        integrationTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          iconType: tab.iconType,
          'data-test-subj': `securitySolutionIntegrationsTab-${tab.id}`,
        })),
      [integrationTabs]
    );

    const list = useMemo(() => {
      if (!selectedTab.appendAutoImportCard) {
        return integrationList;
      }
      return [...integrationList, createAutoImportCard()];
    }, [integrationList, createAutoImportCard, selectedTab.appendAutoImportCard]);

    const [searchTermFromStorage, setSearchTermToStorage] = useStoredIntegrationSearchTerm(spaceId);

    const { isLoading, searchTerm, setCategory, setSearchTerm, setSelectedSubCategory } =
      availablePackages;

    const onTabChange = useCallback(
      (stringId: string) => {
        const id = stringId as IntegrationTabId;
        const trackId = `${TELEMETRY_INTEGRATION_TAB}_${id}`;
        scrollElement.current?.scrollTo?.(0, 0);
        setSelectedTabId?.(id);
        reportLinkClick?.(trackId);
      },
      [setSelectedTabId, reportLinkClick]
    );

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
        selectedTab.id !== IntegrationTabId.recommended
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
      selectedTab.id,
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
        {integrationTabOptions.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              css={buttonGroupStyles}
              buttonSize="compressed"
              color="primary"
              idSelected={selectedTab.id}
              isFullWidth
              legend="Categories"
              onChange={onTabChange}
              options={integrationTabOptions}
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
                    activeIntegrationsCount={activeIntegrationsCount}
                    selectedTabId={selectedTab.id}
                  />
                ) : null
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
SecurityIntegrationsGridTabs.displayName = 'IntegrationsCardGridTabsComponent';
