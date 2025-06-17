/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { IntegrationCardMetadata, TopCalloutRenderer } from '../types';
import { useIntegrationCardList } from '../hooks/use_integration_card_list';
import { SecurityIntegrationsGridTabs } from './security_integrations_grid_tabs';
import { withAvailablePackages, type AvailablePackages } from './with_available_packages';
import { useSelectedTab } from '../hooks/use_selected_tab';

export const DEFAULT_CHECK_COMPLETE_METADATA: IntegrationCardMetadata = {
  activeIntegrations: [],
  isAgentRequired: false,
};

interface SecurityIntegrationsProps {
  availablePackages: AvailablePackages;
  checkCompleteMetadata?: IntegrationCardMetadata;
  topCalloutRenderer?: TopCalloutRenderer;
}

export const SecurityIntegrations = withAvailablePackages<SecurityIntegrationsProps>(
  ({
    availablePackages,
    topCalloutRenderer,
    checkCompleteMetadata = DEFAULT_CHECK_COMPLETE_METADATA,
  }) => {
    const { isAgentRequired, activeIntegrations } = checkCompleteMetadata;

    const { selectedTab, setSelectedTabId } = useSelectedTab();

    const list = useIntegrationCardList({
      integrationsList: availablePackages.filteredCards,
      activeIntegrations,
      selectedTab,
    });
    const activeIntegrationsCount = activeIntegrations?.length ?? 0;

    return (
      <SecurityIntegrationsGridTabs
        isAgentRequired={isAgentRequired}
        activeIntegrationsCount={activeIntegrationsCount}
        topCalloutRenderer={topCalloutRenderer}
        integrationList={list}
        availablePackages={availablePackages}
        setSelectedTabId={setSelectedTabId}
        selectedTab={selectedTab}
      />
    );
  }
);
