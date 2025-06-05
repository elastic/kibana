/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { RenderChildrenType } from '../types';
import { useIntegrationCardList } from '../hooks/use_integration_card_list';
import { IntegrationsCardGridTabsComponent } from './integration_card_grid_tabs_component';

export const DEFAULT_CHECK_COMPLETE_METADATA = {
  installedIntegrationsCount: 0,
  isAgentRequired: false,
};

export const IntegrationsCardGridTabs: RenderChildrenType = ({
  topCalloutRenderer,
  allowedIntegrations,
  availablePackagesResult,
  checkCompleteMetadata = DEFAULT_CHECK_COMPLETE_METADATA,
  selectedTabResult,
}) => {
  const list = useIntegrationCardList({
    integrationsList: allowedIntegrations,
    featuredCardIds: selectedTabResult.selectedTab?.featuredCardIds,
  });

  const { installedIntegrationsCount, isAgentRequired } = checkCompleteMetadata;

  return (
    <IntegrationsCardGridTabsComponent
      isAgentRequired={isAgentRequired}
      installedIntegrationsCount={installedIntegrationsCount}
      topCalloutRenderer={topCalloutRenderer}
      integrationList={list}
      availablePackagesResult={availablePackagesResult}
      selectedTabResult={selectedTabResult}
    />
  );
};
