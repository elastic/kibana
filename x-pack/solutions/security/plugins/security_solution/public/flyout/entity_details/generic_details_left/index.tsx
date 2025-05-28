/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { type FlyoutPanelProps, useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';
import {
  LeftPanelHeader,
  type CspInsightLeftPanelSubTab,
  type EntityDetailsLeftPanelTab,
  type LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { useGetGenericEntity } from '../generic_right/hooks/use_get_generic_entity';
import {
  getInsightsInputTab,
  getFieldsTableTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { GENERIC_FLYOUT_STORAGE_KEYS } from '../generic_right/constants';

export interface GenericEntityDetailsPanelProps extends Record<string, unknown> {
  entityDocId: string;
  value: string;
  field: string;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasVulnerabilitiesFindings?: boolean;
  hasNonClosedAlerts?: boolean;
  path?: {
    tab?: EntityDetailsLeftPanelTab;
    subTab?: CspInsightLeftPanelSubTab;
  };
}

export interface GenericEntityDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'generic_entity_details';
  params: GenericEntityDetailsPanelProps;
}

export const GenericEntityDetailsPanelKey: GenericEntityDetailsExpandableFlyoutProps['key'] =
  'generic_entity_details';

const useSelectedTab = (params: GenericEntityDetailsPanelProps, tabs: LeftPanelTabsType) => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const path = params.path;

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;
    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: GenericEntityDetailsPanelKey,
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

export const GenericEntityDetailsPanel = (params: GenericEntityDetailsPanelProps) => {
  const {
    entityDocId,
    field,
    value,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    scopeId,
  } = params;
  const { getGenericEntity } = useGetGenericEntity(entityDocId);
  const source = getGenericEntity.data?._source;

  const tabs: LeftPanelTabsType = useMemo(() => {
    const insightsTab =
      hasMisconfigurationFindings || hasVulnerabilitiesFindings || hasNonClosedAlerts
        ? [
            getInsightsInputTab({
              name: value,
              fieldName: field as 'related.entity',
              scopeId,
            }),
          ]
        : [];

    const fieldsTableTab = getFieldsTableTab({
      document: source || {},
      tableStorageKey: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS,
    });

    return [fieldsTableTab, ...insightsTab];
  }, [
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    value,
    field,
    scopeId,
    source,
  ]);

  const { selectedTabId, setSelectedTabId } = useSelectedTab(params, tabs);

  if (!selectedTabId) {
    return null;
  }

  return (
    <>
      <LeftPanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabs}
      />
      <LeftPanelContent selectedTabId={selectedTabId} tabs={tabs} />
    </>
  );
};

GenericEntityDetailsPanel.displayName = 'GenericEntityDetailsPanel';
