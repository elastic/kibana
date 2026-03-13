/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import type { AttackDetailsProps } from './types';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';

import { PanelFooter } from './footer';
import { PanelContent } from './content';
import { FLYOUT_STORAGE_KEYS } from './constants/local_storage';
import { AttackDetailsRightPanelKey } from './constants/panel_keys';
import type { AttackDetailsPanelTabType } from './tabs';
import { useKibana } from '../../common/lib/kibana';

import { useTabs } from './hooks/use_tabs';
import { useNavigateToAttackDetailsLeftPanel } from './hooks/use_navigate_to_attack_details_left_panel';
import { useAttackDetailsContext } from './context';
import { PanelHeader } from './header';

export type AttackDetailsPanelPaths = 'overview' | 'table' | 'json';

export const ATTACK_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.attack.attackPreviewTitle', {
    defaultMessage: 'Preview attack details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * Panel to be displayed in Attack Details flyout
 */
export const AttackDetailsPanel: React.FC<Partial<AttackDetailsProps>> = memo(({ path }) => {
  const { storage } = useKibana().services;
  const { openRightPanel, openPreviewPanel } = useExpandableFlyoutApi();
  const { attackId, indexName, isPreviewMode = false, banner } = useAttackDetailsContext();
  const expandDetails = useNavigateToAttackDetailsLeftPanel();

  const { tabsDisplayed, selectedTabId } = useTabs({ path });

  const setSelectedTabId = useCallback(
    (tabId: AttackDetailsPanelTabType['id']) => {
      const previewBanner = banner ?? ATTACK_PREVIEW_BANNER;
      const panel = {
        id: AttackDetailsRightPanelKey,
        path: { tab: tabId },
        params: {
          attackId,
          indexName,
          isPreviewMode,
          ...(isPreviewMode ? { banner: previewBanner } : {}),
        },
      };
      if (isPreviewMode) {
        openPreviewPanel(panel);
      } else {
        openRightPanel(panel);
      }
      // saving which tab is currently selected in the right panel in local storage
      storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);
    },
    [attackId, banner, indexName, isPreviewMode, openPreviewPanel, openRightPanel, storage]
  );

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
      <PanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabsDisplayed}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PanelFooter />
    </>
  );
});

AttackDetailsPanel.displayName = 'AttackDetailsPanel';
