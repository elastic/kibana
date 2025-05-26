/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useSelectedTab } from '../hooks/use_selected_tab';
import { INTEGRATION_TABS } from '../configs/integration_tabs_configs';
import { IntegrationsCardGridTabs } from './integration_card_grid_tabs';
import { WithFilteredIntegrations } from './with_filtered_integrations';
import type { IntegrationCardMetadata, TopCalloutRenderer } from '../types';
import { useIntegrationContext } from '../hooks/integration_context';

export const SecurityIntegrations: React.FC<{
  checkCompleteMetadata?: IntegrationCardMetadata;
  topCalloutRenderer?: TopCalloutRenderer;
}> = ({ checkCompleteMetadata, topCalloutRenderer }) => {
  const { spaceId } = useIntegrationContext();
  const selectedTabResult = useSelectedTab({
    spaceId,
    integrationTabs: INTEGRATION_TABS,
  });
  return (
    <WithFilteredIntegrations
      renderChildren={IntegrationsCardGridTabs}
      prereleaseIntegrationsEnabled={false}
      selectedTabResult={selectedTabResult}
      checkCompleteMetadata={checkCompleteMetadata}
      topCalloutRenderer={topCalloutRenderer}
    />
  );
};
