/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import {
  getRiskInputTab,
  getInsightsInputTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';
import type { CspInsightLeftPanelSubTab } from '../shared/components/left_panel/left_panel_header';
import {
  EntityDetailsLeftPanelTab,
  LeftPanelHeader,
} from '../shared/components/left_panel/left_panel_header';

export interface HostDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  name: string;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasVulnerabilitiesFindings?: boolean;
  hasNonClosedAlerts?: boolean;
  path?: {
    tab?: EntityDetailsLeftPanelTab;
    subTab?: CspInsightLeftPanelSubTab;
  };
}
export interface HostDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'host_details';
  params: HostDetailsPanelProps;
}
export const HostDetailsPanelKey: HostDetailsExpandableFlyoutProps['key'] = 'host_details';

export const HostDetailsPanel = ({
  name,
  isRiskScoreExist,
  scopeId,
  path,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
}: HostDetailsPanelProps) => {
  const [selectedTabId, setSelectedTabId] = useState(
    path?.tab === EntityDetailsLeftPanelTab.CSP_INSIGHTS
      ? EntityDetailsLeftPanelTab.CSP_INSIGHTS
      : EntityDetailsLeftPanelTab.RISK_INPUTS
  );

  useEffect(() => {
    if (path?.tab && path.tab !== selectedTabId) {
      setSelectedTabId(path.tab);
    }
  }, [path?.tab, selectedTabId]);

  const [tabs] = useMemo(() => {
    const isRiskScoreTabAvailable = isRiskScoreExist && name;
    const riskScoreTab = isRiskScoreTabAvailable
      ? [getRiskInputTab({ entityName: name, entityType: EntityType.host, scopeId })]
      : [];
    // Determine if the Insights tab should be included
    const insightsTab =
      hasMisconfigurationFindings || hasVulnerabilitiesFindings || hasNonClosedAlerts
        ? [getInsightsInputTab({ name, fieldName: EntityIdentifierFields.hostName })]
        : [];
    return [[...riskScoreTab, ...insightsTab], EntityDetailsLeftPanelTab.RISK_INPUTS, () => {}];
  }, [
    isRiskScoreExist,
    name,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
  ]);

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

HostDetailsPanel.displayName = 'HostDetailsPanel';
