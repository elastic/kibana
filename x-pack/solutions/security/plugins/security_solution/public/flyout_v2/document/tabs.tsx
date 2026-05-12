/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { JsonTab } from '../shared/tabs/json_tab';
import { PREFIX } from '../../flyout/shared/test_ids';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './components/test_ids';

export type TabId = 'overview' | 'table' | 'json';

export const validTabIds: readonly TabId[] = ['overview', 'table', 'json'];

export interface TabType {
  /** Unique identifier for the tab, used to track the selected tab. */
  id: TabId;
  /** Rendered tab label shown in the tab bar. */
  name: ReactElement;
  /** Content rendered when this tab is selected. */
  content: React.ReactElement;
  /** Test subject for the tab element. */
  'data-test-subj': string;
}

export interface GetTabsDisplayedOptions {
  /**
   * The document to display in the tab content.
   */
  hit: DataTableRecord;
  /**
   * Cell action renderer for the overview and table tabs.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh the flyout content.
   */
  onAlertUpdated: () => void;
  /**
   * Scope ID passed to cell actions for sourcerer context.
   */
  scopeId?: string;
}

/**
 * Returns the tabs to display in the document details flyout right panel.
 */
export const getTabsDisplayed = ({
  hit,
  renderCellActions,
  onAlertUpdated,
  scopeId = '',
}: GetTabsDisplayedOptions): TabType[] => [
  {
    id: 'overview',
    'data-test-subj': OVERVIEW_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.header.overviewTabLabel"
        defaultMessage="Overview"
      />
    ),
    content: (
      <OverviewTab
        hit={hit}
        renderCellActions={renderCellActions}
        onAlertUpdated={onAlertUpdated}
      />
    ),
  },
  {
    id: 'table',
    'data-test-subj': TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.header.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab hit={hit} renderCellActions={renderCellActions} scopeId={scopeId} />,
  },
  {
    id: 'json',
    'data-test-subj': JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.header.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: (
      <JsonTab value={hit.raw as unknown as Record<string, unknown>} data-test-subj={PREFIX} />
    ),
  },
];
