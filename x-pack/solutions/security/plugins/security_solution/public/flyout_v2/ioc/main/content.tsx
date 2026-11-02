/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { RightPanelPaths, RightPanelTabType } from './tabs';
import { IOC_DETAILS_BODY_TEST_ID } from './test_ids';

export interface ContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
  /**
   * Tabs display right below the flyout's header
   */
  tabs: RightPanelTabType[];
}

/**
 * IOC details flyout content that renders the selected tab's content.
 */
export const Content: FC<ContentProps> = ({ selectedTabId, tabs }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <div
      data-test-subj={IOC_DETAILS_BODY_TEST_ID}
      className={selectedTabId === 'json' ? 'iocJsonContent' : undefined}
      css={{ height: '100%' }}
    >
      {selectedTabContent}
    </div>
  );
};

Content.displayName = 'Content';
