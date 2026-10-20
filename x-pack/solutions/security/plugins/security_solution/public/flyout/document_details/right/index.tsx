/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { useTabs } from '../../../flyout_v2/shared/hooks/use_tabs';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout_v2/document/main/constants/local_storage';
import type { RightPanelTabType } from './tabs';
import { allThreeTabs, twoTabs } from './tabs';
import { useKibana } from '../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { PanelNavigation } from './navigation';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import { PanelFooter } from './footer';
import { useFlyoutIsExpandable } from './hooks/use_flyout_is_expandable';
import { DocumentEventTypes } from '../../../common/lib/telemetry';

export type RightPanelPaths = 'overview' | 'table' | 'json';

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const RightPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { storage, telemetry } = useKibana().services;
  const { openRightPanel, closeFlyout } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isRulePreview, dataAsNestedObject, getFieldsData } =
    useDocumentDetailsContext();

  // if the flyout is expandable we render all 3 tabs (overview, table and json)
  // if the flyout is not, we render only table and json
  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });
  const tabsDisplayed = flyoutIsExpandable ? allThreeTabs : twoTabs;
  const { selectedTabId } = useTabs<RightPanelPaths>({
    validTabIds: tabsDisplayed.map((tab) => tab.id),
    storageKey: FLYOUT_STORAGE_KEYS.SELECTED_TAB,
    initialTabId: path?.tab,
  });

  const setSelectedTabId = (tabId: RightPanelTabType['id']) => {
    openRightPanel({
      id: DocumentDetailsRightPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });

    // saving which tab is currently selected in the right panel in local storage
    storage.set(FLYOUT_STORAGE_KEYS.SELECTED_TAB, tabId);

    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
      location: scopeId,
      panel: 'right',
      tabId,
    });
  };

  // If flyout is open in rule preview, do not reload with stale information
  useEffect(() => {
    const beforeUnloadHandler = () => {
      if (isRulePreview) {
        closeFlyout();
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [isRulePreview, closeFlyout]);

  return (
    <>
      <PanelNavigation flyoutIsExpandable={flyoutIsExpandable} />
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PanelFooter isRulePreview={isRulePreview} />
    </>
  );
});

RightPanel.displayName = 'RightPanel';
