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
import { JsonTab } from '../../shared/tabs/json_tab';
import { TableTab } from '../../shared/tabs/table_tab';
import { cellActionRenderer } from '../../shared/components/cell_actions';
import { OverviewTab } from './tabs/overview_tab';
import {
  ATTACK_FLYOUT_V2_PREFIX,
  HEADER_JSON_TAB_TEST_ID,
  HEADER_OVERVIEW_TAB_TEST_ID,
  HEADER_TABLE_TAB_TEST_ID,
} from './constants/test_ids';

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
   * The attack document to display in the tab content.
   */
  hit: DataTableRecord;
  /**
   * Scope ID passed to cell actions for sourcerer context. Defaults to '' which
   * resolves to the default sourcerer scope.
   */
  scopeId?: string;
}

/**
 * Returns the tabs to display in the attack flyout.
 */
export const getTabsDisplayed = ({ hit, scopeId = '' }: GetTabsDisplayedOptions): TabType[] => [
  {
    id: 'overview',
    'data-test-subj': HEADER_OVERVIEW_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyoutV2.attack.header.overviewTabLabel"
        defaultMessage="Overview"
      />
    ),
    content: <OverviewTab hit={hit} />,
  },
  {
    id: 'table',
    'data-test-subj': HEADER_TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyoutV2.attack.header.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab hit={hit} renderCellActions={cellActionRenderer} scopeId={scopeId} />,
  },
  {
    id: 'json',
    'data-test-subj': HEADER_JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyoutV2.attack.header.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: (
      <JsonTab
        value={hit.raw as unknown as Record<string, unknown>}
        data-test-subj={ATTACK_FLYOUT_V2_PREFIX}
      />
    ),
  },
];
