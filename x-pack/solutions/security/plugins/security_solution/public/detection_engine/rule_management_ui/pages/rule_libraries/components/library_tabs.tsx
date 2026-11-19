/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiNotificationBadge, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import * as i18n from '../translations';

export type LibraryTab = 'rules' | 'exceptionLists' | 'valueLists';

interface LibraryTabsProps {
  activeTab: LibraryTab;
  counts: Record<LibraryTab, number>;
  onSelect: (tab: LibraryTab) => void;
}

const TAB_LABELS: Record<LibraryTab, string> = {
  rules: i18n.TAB_RULES,
  exceptionLists: i18n.TAB_EXCEPTION_LISTS,
  valueLists: i18n.TAB_VALUE_LISTS,
};

const TAB_ORDER: LibraryTab[] = ['rules', 'exceptionLists', 'valueLists'];

export const LibraryTabs = ({ activeTab, counts, onSelect }: LibraryTabsProps) => {
  const hasListTabs = counts.exceptionLists > 0 || counts.valueLists > 0;
  if (!hasListTabs) {
    return null;
  }

  return (
    <>
      <EuiTabs>
        {TAB_ORDER.filter((tab) => tab === 'rules' || counts[tab] > 0).map((tab) => (
          <EuiTab
            key={tab}
            isSelected={activeTab === tab}
            onClick={() => onSelect(tab)}
            append={<EuiNotificationBadge color="subdued">{counts[tab]}</EuiNotificationBadge>}
            data-test-subj={`ruleLibraryTab-${tab}`}
          >
            {TAB_LABELS[tab]}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
    </>
  );
};
