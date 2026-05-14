/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { useTabs } from '../../../../../flyout/entity_details/host_details_left/hooks';
import { LeftPanelHeader } from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_content';
import type {
  EntityDetailsLeftPanelTab,
  EntityDetailsPath,
} from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';

export interface HostDetailsProps {
  isRiskScoreExist: boolean;
  hostName: string;
  entityId: string;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasVulnerabilitiesFindings?: boolean;
  hasNonClosedAlerts?: boolean;
  entityStoreEntityId?: string;
  initialPath?: EntityDetailsPath;
}

export const HostDetails: FC<HostDetailsProps> = ({
  isRiskScoreExist,
  hostName,
  entityId,
  scopeId,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
  entityStoreEntityId,
  initialPath,
}) => {
  const tabs = useTabs({
    isRiskScoreExist,
    hostName,
    entityId,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    entityStoreEntityId,
  });

  const defaultTabId = useMemo(() => {
    if (initialPath?.tab) {
      const match = tabs.find((tab) => tab.id === initialPath.tab);
      if (match) return match.id;
    }
    return tabs[0]?.id;
  }, [initialPath, tabs]);

  const [selectedTabId, setSelectedTabId] = useState<EntityDetailsLeftPanelTab | undefined>(
    defaultTabId
  );

  if (!selectedTabId) {
    return null;
  }

  return (
    <>
      <LeftPanelHeader
        tabs={tabs}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <LeftPanelContent tabs={tabs} selectedTabId={selectedTabId} />
    </>
  );
};

HostDetails.displayName = 'HostDetails';
