/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { extractChangedFieldNames } from '../../utils/extract_changed_field_names';
import { ChangeDetailsTab } from './change_details_tab';
import { ChangeHistoryFlyoutHeader } from './change_history_flyout_header';
import { OverviewTab } from './overview_tab';
import { ChangeHistoryFlyoutActions } from './change_history_flyout_actions';
import * as i18n from './translations';

interface ChangeHistoryFlyoutProps {
  item: RuleHistoryItem;
  onClose: () => void;
}

export function ChangeHistoryFlyout({ item, onClose }: ChangeHistoryFlyoutProps): JSX.Element {
  const titleId = useGeneratedHtmlId();
  const changedFields = useMemo(() => extractChangedFieldNames(item), [item]);
  const [selectedTab, setSelectedTab] = useState(
    changedFields.length > 0 ? TabId.Changes : TabId.Overview
  );
  const tabs = useMemo(
    () => (changedFields.length > 0 ? TABS : TABS_WITHOUT_CHANGES),
    [changedFields]
  );
  const ruleSnapshot = item.rule as Record<string, unknown>;
  const oldValues = (item.old_values ?? {}) as Record<string, unknown>;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="ruleChangeHistoryFlyout"
    >
      <EuiFlyoutHeader>
        <ChangeHistoryFlyoutHeader item={item} titleId={titleId} />
        <EuiSpacer size="m" />
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === selectedTab}
              onClick={() => setSelectedTab(tab.id)}
              data-test-subj={`ruleChangeHistoryFlyoutTab-${tab.id}`}
            >
              {tab.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTab === 'changes' ? (
          <ChangeDetailsTab
            changedFields={changedFields}
            oldValues={oldValues}
            ruleSnapshot={ruleSnapshot}
          />
        ) : (
          <OverviewTab rule={item.rule} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <ChangeHistoryFlyoutActions onClose={onClose} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

enum TabId {
  Changes = 'changes',
  Overview = 'overview',
}

const TABS = [
  { id: TabId.Changes, title: i18n.CHANGE_DETAILS_TAB_TITLE },
  { id: TabId.Overview, title: i18n.OVERVIEW_AT_SAVE_TAB_TITLE },
] as const;

const TABS_WITHOUT_CHANGES = [
  { id: TabId.Overview, title: i18n.OVERVIEW_AT_SAVE_TAB_TITLE },
] as const;
