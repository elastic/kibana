/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useState } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import { DocumentDetailsPreviewBanner } from './components/preview_banner';
import { PreviewPanelFooter } from '../preview/footer';
import { useTabs } from './hooks/use_tabs';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import { PanelFooter } from './footer';
import { useFlyoutIsExpandable } from './hooks/use_flyout_is_expandable';

export type RightPanelPaths = 'overview' | 'table' | 'json';

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const RightPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { closeFlyout } = useFlyoutApi();
  const {
    isRulePreview,
    dataAsNestedObject,
    getFieldsData,
    dataFormattedForFieldBrowser,
    isChild,
    isPreview,
  } = useDocumentDetailsContext();

  // if the flyout is expandable we render all 3 tabs (overview, table and json)
  // if the flyout is not, we render only table and json
  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });
  const { tabsDisplayed, defaultSelectedTabId } = useTabs({ flyoutIsExpandable, path });

  const [selectedTabId, setSelectedTabId] = useState(defaultSelectedTabId);

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
      {isChild && isPreview && (
        <DocumentDetailsPreviewBanner dataFormattedForFieldBrowser={dataFormattedForFieldBrowser} />
      )}
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      {isChild ? <PreviewPanelFooter /> : <PanelFooter isRulePreview={isRulePreview} />}
    </>
  );
});

RightPanel.displayName = 'RightPanel';
