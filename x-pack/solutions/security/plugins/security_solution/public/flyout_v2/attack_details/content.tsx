/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FLYOUT_BODY_TEST_ID } from './constants/test_ids';
import type { AttackDetailsPanelPaths, AttackDetailsPanelTabType } from './types';

export interface ContentProps {
  /**
   * Id of the tab whose content should be displayed.
   */
  selectedTabId: AttackDetailsPanelPaths;
  /**
   * The full list of tabs (including their content) so the active one can be
   * looked up by id.
   */
  tabs: AttackDetailsPanelTabType[];
}

/**
 * Body section of the v2 attack details flyout. Renders the active tab's
 * content; intended to be wrapped in `<EuiFlyoutBody>` by the parent.
 */
export const Content: FC<ContentProps> = memo(({ selectedTabId, tabs }) => {
  const selectedTabContent = tabs.find((tab) => tab.id === selectedTabId)?.content;

  return <div data-test-subj={FLYOUT_BODY_TEST_ID}>{selectedTabContent}</div>;
});

Content.displayName = 'Content';
