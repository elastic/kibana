/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import {
  getRiskInputTab,
  getInsightsInputTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import type {
  LeftPanelTabsType,
  EntityDetailsLeftPanelTab,
} from '../shared/components/left_panel/left_panel_header';

import type { HostDetailsPanelProps } from '.';
import { HostDetailsPanelKey } from '.';

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
  name,
  scopeId,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
}: HostDetailsPanelProps): LeftPanelTabsType => {
  return useMemo(() => {
    const isRiskScoreTabAvailable = isRiskScoreExist && name;
    const riskScoreTab = isRiskScoreTabAvailable
      ? [getRiskInputTab({ entityName: name, entityType: EntityType.host, scopeId })]
      : [];

    // Determine if the Insights tab should be included
    const insightsTab =
      hasMisconfigurationFindings || hasVulnerabilitiesFindings || hasNonClosedAlerts
        ? [getInsightsInputTab({ name, fieldName: EntityIdentifierFields.hostName, scopeId })]
        : [];

    return [...riskScoreTab, ...insightsTab];
  }, [
    isRiskScoreExist,
    name,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
  ]);
};
