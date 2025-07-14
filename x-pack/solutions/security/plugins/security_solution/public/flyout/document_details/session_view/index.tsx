/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import type {
  FlyoutPanelProps,
  type PanelPath,
  useExpandableFlyoutApi,
} from '@kbn/expandable-flyout';
import { PanelContent } from './content';
import { PanelHeader } from './header';
import type { CustomProcess } from './context';
import { useSessionViewPanelContext } from './context';
import type { SessionViewPanelTabType } from './tabs';
import * as tabs from './tabs';
import { DocumentDetailsSessionViewPanelKey } from '../shared/constants/panel_keys';
import { SESSION_VIEWER_BANNER } from '../left/components/session_view';

export const allTabs = [tabs.processTab, tabs.metadataTab, tabs.alertsTab];
export type SessionViewPanelPaths = 'process' | 'metadata' | 'alerts';

export interface SessionViewPanelProps extends FlyoutPanelProps {
  key: typeof DocumentDetailsSessionViewPanelKey;
  path?: PanelPath;
  params: {
    eventId: string;
    indexName: string;
    selectedProcess: CustomProcess | null;
    index: string;
    sessionEntityId: string;
    sessionStartTime: string;
    scopeId: string;
    investigatedAlertId: string;
  };
}

/**
 * Displays node details panel for session view
 */
export const SessionViewPanel: FC<Partial<SessionViewPanelProps>> = memo(({ path }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const {
    eventId,
    indexName,
    selectedProcess,
    index,
    sessionEntityId,
    sessionStartTime,
    scopeId,
    investigatedAlertId,
  } = useSessionViewPanelContext();

  const selectedTabId = useMemo(() => {
    // we use the value passed from the url and use it if it exists in the list of tabs to display
    if (path) {
      const selectedTab = allTabs.map((tab) => tab.id).find((tabId) => tabId === path.tab);
      if (selectedTab) {
        return selectedTab;
      }
    }

    // we default back to the first tab of the list of tabs to display in case everything else has failed
    return allTabs[0].id;
  }, [path]);

  const setSelectedTabId = useCallback(
    (tabId: SessionViewPanelTabType['id']) => {
      openPreviewPanel({
        id: DocumentDetailsSessionViewPanelKey,
        path: {
          tab: tabId,
        },
        params: {
          eventId,
          indexName,
          selectedProcess,
          index,
          sessionEntityId,
          sessionStartTime,
          scopeId,
          investigatedAlertId,
          banner: SESSION_VIEWER_BANNER,
        },
      });
    },
    [
      eventId,
      index,
      indexName,
      investigatedAlertId,
      openPreviewPanel,
      scopeId,
      selectedProcess,
      sessionEntityId,
      sessionStartTime,
    ]
  );

  return (
    <>
      <PanelHeader
        tabs={allTabs}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <PanelContent tabs={allTabs} selectedTabId={selectedTabId} />
    </>
  );
});

SessionViewPanel.displayName = 'SessionViewPanel';
