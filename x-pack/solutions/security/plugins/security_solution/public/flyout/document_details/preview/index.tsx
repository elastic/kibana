/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsPreviewPanelKey } from '../shared/constants/panel_keys';
import { useTabs } from '../../../flyout_v2/shared/hooks/use_tabs';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout_v2/document/main/constants/local_storage';
import { useFlyoutIsExpandable } from '../right/hooks/use_flyout_is_expandable';
import type { RightPanelTabType } from '../right/tabs';
import { allThreeTabs, twoTabs } from '../right/tabs';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { PanelHeader } from '../right/header';
import { PanelContent } from '../right/content';
import { PreviewPanelFooter } from './footer';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from './constants';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const PreviewPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const {
    eventId,
    indexName,
    scopeId,
    getFieldsData,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
  } = useDocumentDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });

  const tabsDisplayed = flyoutIsExpandable ? allThreeTabs : twoTabs;
  const { selectedTabId } = useTabs<RightPanelTabType['id']>({
    validTabIds: tabsDisplayed.map((tab) => tab.id),
    storageKey: FLYOUT_STORAGE_KEYS.SELECTED_TAB,
    initialTabId: path?.tab,
  });

  const setSelectedTabId = (tabId: RightPanelTabType['id']) => {
    openPreviewPanel({
      id: DocumentDetailsPreviewPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
        isPreviewMode: true,
        banner: isAlert ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
      },
    });
  };

  return (
    <>
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        css={{ marginTop: '-15px' }}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PreviewPanelFooter />
    </>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
