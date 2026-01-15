/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useIOCDetailsContext } from './context';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { IOCDetailsProps } from './types';
import { IOCRightPanelKey } from './constants/panel_keys';
import { useTabs } from './hooks/use_tabs';
import { FLYOUT_STORAGE_KEYS } from './constants/local_storage';
import { useKibana } from '../../common/lib/kibana';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { RightPanelTabType } from './tabs';
import { PanelFooter } from './footer';

export type RightPanelPaths = 'overview' | 'table' | 'json';

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const IOCPanel: FC<Partial<IOCDetailsProps>> = memo(({ path }) => {
  const { storage } = useKibana().services;
  const { indicator } = useIOCDetailsContext();
  const { openRightPanel } = useExpandableFlyoutApi();

  const { tabsDisplayed, selectedTabId } = useTabs({ path });

  const setSelectedTabId = useCallback(
    (tabId: RightPanelTabType['id']) => {
      openRightPanel({
        id: IOCRightPanelKey,
        path: {
          tab: tabId,
        },
        params: {
          id: indicator._id,
        },
      });

      // saving which tab is currently selected in the right panel in local storage
      storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);
    },
    [indicator._id, openRightPanel, storage]
  );

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PanelFooter />
    </>
  );
});

IOCPanel.displayName = 'IOCPanel';
