/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityType } from '../../../../common/entity_analytics/types';
import {
  getRiskInputTab,
  getInsightsInputTab,
  getResolutionGroupTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import type {
  LeftPanelTabsType,
  EntityDetailsLeftPanelTab,
} from '../shared/components/left_panel/left_panel_header';
import { getGraphViewTab } from '../shared/components/left';

import type { HostDetailsPanelProps } from '.';
import { HostDetailsPanelKey } from '.';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';

export const useSelectedTab = (params: HostDetailsPanelProps, tabs: LeftPanelTabsType) => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const path = params.path;

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: HostDetailsPanelKey,
      params: {
        ...params,
        path: {
          tab: tabId,
        },
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

export const useTabs = ({
  isRiskScoreExist,
  hostName,
  entityId,
  scopeId,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
  entityStoreEntityId,
}: HostDetailsPanelProps): LeftPanelTabsType => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();

  return useMemo(() => {
    const isRiskScoreTabAvailable = (isRiskScoreExist || entityStoreEntityId) && hostName;
    const riskScoreTab = isRiskScoreTabAvailable
      ? [
          getRiskInputTab({
            entityName: hostName ?? '',
            entityType: EntityType.host,
            scopeId,
            entityId: entityStoreEntityId,
          }),
        ]
      : [];

    // Determine if the Insights tab should be included
    const insightsTab =
      hasMisconfigurationFindings || hasVulnerabilitiesFindings || hasNonClosedAlerts
        ? [
            getInsightsInputTab({
              field: 'host.name',
              value: hostName,
              entityId,
              scopeId,
              entityType: EntityType.host,
            }),
          ]
        : [];

    const graphViewTab = entityStoreEntityId
      ? [getGraphViewTab({ entityId: entityStoreEntityId, scopeId })]
      : [];

    const resolutionTab =
      entityStoreEntityId && hasEntityResolutionLicense
        ? [
            getResolutionGroupTab({
              entityId: entityStoreEntityId,
              entityType: EntityType.host,
              scopeId,
            }),
          ]
        : [];

    return [...riskScoreTab, ...insightsTab, ...graphViewTab, ...resolutionTab];
  }, [
    isRiskScoreExist,
    hostName,
    entityId,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    entityStoreEntityId,
    hasEntityResolutionLicense,
  ]);
};
