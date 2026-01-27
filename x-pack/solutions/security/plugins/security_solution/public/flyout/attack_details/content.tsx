/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { AttackDetailsPanelTabType } from './tabs';
import { FlyoutBody } from '../shared/components/flyout_body';

import type { AttackDetailsPanelPaths } from '.';
import { FLYOUT_BODY_TEST_ID } from './constants/test_ids';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: AttackDetailsPanelPaths;
  /**
   * Tabs display below the flyout's header
   */
  tabs: AttackDetailsPanelTabType[];
}

/**
 * Attack details expandable flyout section, that will display the content
 * of the overview, table and json tabs.
 */
export const PanelContent: FC<PanelContentProps> = memo(({ selectedTabId, tabs }) => {
  const selectedTabContent = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );

  return <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>{selectedTabContent}</FlyoutBody>;
});

PanelContent.displayName = 'PanelContent';
