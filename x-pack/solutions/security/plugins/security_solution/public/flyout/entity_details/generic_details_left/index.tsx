/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FlyoutPanelProps } from '@kbn/expandable-flyout';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';
import type {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { useSelectedTab, useTabs } from './hooks';

export interface GenericEntityDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  name: string;
  entityDocId: string;
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

export const GenericEntityDetailsPanel = (params: GenericEntityDetailsPanelProps) => {
  const tabs = useTabs(params) || [];
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
