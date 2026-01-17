/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import { useTabs } from './tabs';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';

interface ServiceParam {
  name: string;
  email: string[];
}

export interface ServiceDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  service: ServiceParam;
  path?: string;
  scopeId: string;
}
export interface ServiceDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'service_details';
  params: ServiceDetailsPanelProps;
}
export const ServiceDetailsPanelKey: ServiceDetailsExpandableFlyoutProps['key'] = 'service_details';

export const ServiceDetailsPanel = ({
  isRiskScoreExist,
  service,
  path,
  scopeId,
}: ServiceDetailsPanelProps) => {
  const tabs = useTabs(service.name, scopeId);

  const { selectedTabId, setSelectedTabId } = useSelectedTab(isRiskScoreExist, service, tabs, path);

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

const useSelectedTab = (
  isRiskScoreExist: boolean,
  service: ServiceParam,
  tabs: LeftPanelTabsType,
  path: string | undefined
) => {
  const { openChildPanel } = useFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openChildPanel({
      id: ServiceDetailsPanelKey,
      params: {
        service,
        isRiskScoreExist,
        path: {
          tab: tabId,
        },
        isChild: true,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

ServiceDetailsPanel.displayName = 'ServiceDetailsPanel';
