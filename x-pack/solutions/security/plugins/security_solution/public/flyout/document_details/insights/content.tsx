/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { InsightsPanelPaths } from '.';
import type { LeftPanelTabType } from './tabs';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: InsightsPanelPaths;
  /**
   * Tabs display at the top of left panel
   */
  tabs: LeftPanelTabType[];
}

/**
 * Document details expandable flyout left section. Appears after the user clicks on the expand details button in the right section.
 * Displays the content of investigation and insights tabs (visualize is hidden for 8.9).
 */
export const PanelContent: FC<PanelContentProps> = ({ selectedTabId, tabs }) => {
  const selectedTabContent = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );

  return <FlyoutBody>{selectedTabContent}</FlyoutBody>;
};

PanelContent.displayName = 'PanelContent';
