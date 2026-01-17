/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import { useManagedUser } from '../shared/hooks/use_managed_user';
import { useTabs } from './tabs';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';

interface UserParam {
  name: string;
  email: string[];
}

export interface UserDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  user: UserParam;
  path?: string;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasNonClosedAlerts?: boolean;
}
export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user_details';
  params: UserDetailsPanelProps;
}
export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user_details';

export const UserDetailsPanel = ({
  isRiskScoreExist,
  user,
  path,
  scopeId,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
}: UserDetailsPanelProps) => {
  const managedUser = useManagedUser();
  const tabs = useTabs(
    managedUser.data,
    user.name,
    isRiskScoreExist,
    scopeId,
    hasMisconfigurationFindings,
    hasNonClosedAlerts
  );

  const { selectedTabId, setSelectedTabId } = useSelectedTab(
    isRiskScoreExist,
    user,
    tabs,
    path,
    hasMisconfigurationFindings,
    hasNonClosedAlerts
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
  user: UserParam,
  tabs: LeftPanelTabsType,
  path: string | undefined,
  hasMisconfigurationFindings?: boolean,
  hasNonClosedAlerts?: boolean
) => {
  const { openChildPanel } = useFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openChildPanel({
      id: UserDetailsPanelKey,
      params: {
        user,
        isRiskScoreExist,
        hasMisconfigurationFindings,
        hasNonClosedAlerts,
        path: {
          tab: tabId,
        },
        isChild: true,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
