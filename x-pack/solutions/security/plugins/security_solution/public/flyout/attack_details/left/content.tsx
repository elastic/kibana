/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { LeftPanelPaths } from '../constants/left_panel_paths';
import type { LeftPanelTabType } from './tabs';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: LeftPanelPaths;
  /**
   * Tabs to display in the left panel
   */
  tabs: LeftPanelTabType[];
}

/**
 * Content area of the Attack Details expandable flyout left section.
 * Renders the content of the selected tab (Insights or Notes).
 */
export const PanelContent: FC<PanelContentProps> = ({ selectedTabId, tabs }) => {
  const { euiTheme } = useEuiTheme();
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      {selectedTabContent}
    </FlyoutBody>
  );
};

PanelContent.displayName = 'PanelContent';
