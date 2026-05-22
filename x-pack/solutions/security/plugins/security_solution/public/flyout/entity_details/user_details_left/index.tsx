/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useManagedUser } from '../shared/hooks/use_managed_user';
import { useTabs } from './tabs';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';
import type { IdentityFields } from '../../document_details/shared/utils';

export interface UserDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  /** Display / filter user name; may be omitted in serialized flyout state — falls back to `identityFields['user.name']`. */
  userName?: string;
  identityFields?: IdentityFields;
  /** Canonical Entity Store v2 id (`entity.id`) when known. */
  entityId?: string;
  path?: PanelPath;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasNonClosedAlerts?: boolean;
  entityStoreEntityId?: string;
}
export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user_details';
  params: UserDetailsPanelProps;
}
export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user_details';

export const UserDetailsPanel = ({
  isRiskScoreExist,
  identityFields,
  userName,
  entityId,
  path,
  scopeId,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
  entityStoreEntityId,
}: UserDetailsPanelProps) => {
  const managedUser = useManagedUser();

  const resolvedUserName = userName ?? identityFields?.['user.name'] ?? '';

  const tabs = useTabs(
    managedUser.data,
    resolvedUserName,
    isRiskScoreExist,
    scopeId,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    identityFields,
    entityId,
    entityStoreEntityId
  );

  const { selectedTabId, setSelectedTabId } = useSelectedTab(
    isRiskScoreExist,
    identityFields,
    entityId,
    resolvedUserName,
    tabs,
    path,
    scopeId,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    entityStoreEntityId
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
  identityFields: IdentityFields | undefined,
  entityId: string | undefined,
  resolvedUserName: string,
  tabs: LeftPanelTabsType,
  path: PanelPath | undefined,
  scopeId: string,
  hasMisconfigurationFindings?: boolean,
  hasNonClosedAlerts?: boolean,
  entityStoreEntityId?: string
) => {
  const { openLeftPanel } = useExpandableFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs.length > 0 ? tabs[0].id : undefined;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: UserDetailsPanelKey,
      params: {
        userName: resolvedUserName,
        identityFields,
        entityId,
        isRiskScoreExist,
        hasMisconfigurationFindings,
        hasNonClosedAlerts,
        entityStoreEntityId,
        path: {
          tab: tabId,
        },
        scopeId,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
