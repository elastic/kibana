/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { AttackDetailsProps } from '../types';
import { AttackDetailsPreviewPanelKey } from '../constants/panel_keys';
import type { AttackDetailsPanelTabType } from '../tabs';
import { useTabs } from '../hooks/use_tabs';
import { ATTACK_PREVIEW_BANNER, useAttackDetailsContext } from '../context';
import { PanelHeader } from '../header';
import { PanelContent } from '../content';
import { PanelFooter } from '../footer';

/**
 * Panel to be displayed in Attack Details flyout preview section.
 */
export const AttackDetailsPreviewPanel: React.FC<Partial<AttackDetailsProps>> = memo(({ path }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { attackId, indexName } = useAttackDetailsContext();
  const { tabsDisplayed, selectedTabId } = useTabs({ path });

  const setSelectedTabId = useCallback(
    (tabId: AttackDetailsPanelTabType['id']) => {
      openPreviewPanel({
        id: AttackDetailsPreviewPanelKey,
        path: { tab: tabId },
        params: {
          attackId,
          indexName,
          banner: ATTACK_PREVIEW_BANNER,
        },
      });
    },
    [attackId, indexName, openPreviewPanel]
  );

  return (
    <>
      <PanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabsDisplayed}
        css={{ marginTop: '-15px' }}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PanelFooter />
    </>
  );
});

AttackDetailsPreviewPanel.displayName = 'AttackDetailsPreviewPanel';
