/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { useSelectedTab } from '../hooks/use_selected_tab';
import type { IntegrationCardMetadata, RenderChildrenType, TopCalloutRenderer } from '../types';
import { useFilterCards } from '../hooks/use_filter_cards';
import { useIntegrationContext } from '../hooks/integration_context';

export const AvailableIntegrationsComponent: React.FC<{
  useAvailablePackages: AvailablePackagesHookType;
  renderChildren: RenderChildrenType;
  prereleaseIntegrationsEnabled: boolean;
  checkCompleteMetadata?: IntegrationCardMetadata;
  topCalloutRenderer?: TopCalloutRenderer;
}> = ({
  useAvailablePackages,
  renderChildren,
  prereleaseIntegrationsEnabled,
  checkCompleteMetadata,
  topCalloutRenderer,
}) => {
  const { spaceId, integrationTabs } = useIntegrationContext();

  const selectedTabResult = useSelectedTab({
    spaceId,
    integrationTabs,
  });

  const { availablePackagesResult, allowedIntegrations } = useFilterCards({
    featuredCardIds: selectedTabResult.selectedTab?.featuredCardIds,
    useAvailablePackages,
    prereleaseIntegrationsEnabled,
  });

  return renderChildren({
    allowedIntegrations,
    availablePackagesResult,
    checkCompleteMetadata,
    selectedTabResult,
    topCalloutRenderer,
  });
};
