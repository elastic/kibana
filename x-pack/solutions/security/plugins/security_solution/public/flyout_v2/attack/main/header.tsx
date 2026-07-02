/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { flyoutHeaderBlockStyles } from '../../shared/components/flyout_header_block';
import { Notes } from '../../shared/components/notes';
import { HeaderTitle } from './components/header_title';
import { Status } from './components/status';
import { AlertsCount } from './components/alerts_count';
import { Assignees } from './components/assignees';
import { HEADER_SUMMARY_PANEL_TEST_ID } from './constants/test_ids';
import type { TabId, TabType } from './tabs';

export interface HeaderProps {
  /**
   * The attack document to display.
   */
  hit: DataTableRecord;
  /**
   * Called after attack mutations (status change, assignee update, etc.) to refresh related views.
   */
  onAttackUpdated: () => void;
  /**
   * Called when the user clicks the notes button to open the notes tool flyout.
   */
  onShowNotes: () => void;
  /**
   * Tabs to render in the header. Omitted when the header is rendered on its own
   * (e.g. the Discover doc-viewer integration) where no tab navigation is shown.
   */
  tabs?: TabType[];
  /**
   * Currently selected tab id.
   */
  selectedTabId?: TabId;
  /**
   * Callback to change the selected tab.
   */
  setSelectedTabId?: (id: TabId) => void;
}

/**
 * Assembled header for the attack flyout. Renders the title, status,
 * alerts count, assignees, and notes. All four summary blocks share a single
 * 2-column flex layout so they wrap together on narrow widths. Padding is
 * provided by the parent `EuiFlyoutHeader`; the header itself adds no extra
 * panel padding.
 */
export const Header: FC<HeaderProps> = memo(
  ({ hit, onAttackUpdated, onShowNotes, tabs, selectedTabId, setSelectedTabId }) => {
    const documentId = useMemo(() => hit.raw._id ?? '', [hit]);

    return (
      <>
        <HeaderTitle hit={hit} />
        <EuiSpacer size="m" />
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          wrap
          data-test-subj={HEADER_SUMMARY_PANEL_TEST_ID}
        >
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <Status hit={hit} onAttackUpdated={onAttackUpdated} />
              </EuiFlexItem>
              <EuiFlexItem>
                <AlertsCount hit={hit} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <Assignees hit={hit} onAttackUpdated={onAttackUpdated} />
              </EuiFlexItem>
              <EuiFlexItem>
                <Notes documentId={documentId} onShowNotes={onShowNotes} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {tabs && tabs.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiTabs size="l" expand>
              {tabs.map((tab, index) => (
                <EuiTab
                  key={index}
                  onClick={() => setSelectedTabId?.(tab.id)}
                  isSelected={tab.id === selectedTabId}
                  data-test-subj={tab['data-test-subj']}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </>
        )}
      </>
    );
  }
);

Header.displayName = 'Header';
