/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { SessionViewPanelPaths } from '.';
import type { SessionViewPanelTabType } from './tabs';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: SessionViewPanelPaths;
  /**
   * Tabs display right below the flyout's header
   */
  tabs: SessionViewPanelTabType[];
}

/**
 * SessionView preview panel content, that renders the process, metadata and alerts tab contents.
 */
export const PanelContent: FC<PanelContentProps> = ({ selectedTabId, tabs }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return <FlyoutBody>{selectedTabContent}</FlyoutBody>;
};

PanelContent.displayName = 'PanelContent';
