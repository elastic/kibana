/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import { useTabs } from './tabs';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';

const getServiceNameFromEntityIdentifiers = (entityIdentifiers: EntityIdentifiers): string =>
  entityIdentifiers['service.name'] || Object.values(entityIdentifiers)[0] || '';

export interface ServiceDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  entityIdentifiers: EntityIdentifiers;
  path?: PanelPath;
  scopeId: string;
}
export interface ServiceDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'service_details';
  params: ServiceDetailsPanelProps;
}
export const ServiceDetailsPanelKey: ServiceDetailsExpandableFlyoutProps['key'] = 'service_details';

export const ServiceDetailsPanel = ({
  isRiskScoreExist,
  entityIdentifiers,
  path,
  scopeId,
}: ServiceDetailsPanelProps) => {
  const serviceName = useMemo(
    () => getServiceNameFromEntityIdentifiers(entityIdentifiers ?? {}),
    [entityIdentifiers]
  );
  const tabs = useTabs(serviceName, scopeId);

  const { selectedTabId, setSelectedTabId } = useSelectedTab(
    isRiskScoreExist,
    entityIdentifiers ?? {},
    scopeId,
    tabs,
    path
  );

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
  entityIdentifiers: EntityIdentifiers,
  scopeId: string,
  tabs: LeftPanelTabsType,
  path: PanelPath | undefined
) => {
  const { openLeftPanel } = useExpandableFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: ServiceDetailsPanelKey,
      params: {
        entityIdentifiers,
        isRiskScoreExist,
        scopeId,
        path: {
          tab: tabId,
        },
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

ServiceDetailsPanel.displayName = 'ServiceDetailsPanel';
