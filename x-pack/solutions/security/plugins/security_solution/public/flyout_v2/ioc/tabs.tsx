/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { JsonTab } from '../shared/tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';
import {
  IOC_DETAILS_OVERVIEW_TAB_TEST_ID,
  IOC_DETAILS_TABLE_TAB_TEST_ID,
  IOC_DETAILS_JSON_TAB_TEST_ID,
} from './test_ids';

export type TabId = 'overview' | 'table' | 'json';

export const validTabIds: readonly TabId[] = ['overview', 'table', 'json'];

export interface TabType {
  id: TabId;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

export interface GetTabsDisplayedOptions {
  /**
   * The indicator document to render inside each tab
   */
  indicator: Indicator;
  /**
   * Callback to navigate to the table tab from the overview tab
   */
  onViewAllFieldsInTable?: () => void;
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Returns the tabs to display in the IOC details flyout.
 */
export const getTabsDisplayed = ({
  indicator,
  onViewAllFieldsInTable,
  renderCellActions,
}: GetTabsDisplayedOptions): TabType[] => [
  {
    id: 'overview',
    'data-test-subj': IOC_DETAILS_OVERVIEW_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.iocDetails.header.overviewTabLabel"
        defaultMessage="Overview"
      />
    ),
    content: (
      <OverviewTab
        indicator={indicator}
        onViewAllFieldsInTable={onViewAllFieldsInTable}
        renderCellActions={renderCellActions}
      />
    ),
  },
  {
    id: 'table',
    'data-test-subj': IOC_DETAILS_TABLE_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.iocDetails.header.tableTabLabel"
        defaultMessage="Table"
      />
    ),
    content: <TableTab indicator={indicator} renderCellActions={renderCellActions} />,
  },
  {
    id: 'json',
    'data-test-subj': IOC_DETAILS_JSON_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.iocDetails.header.jsonTabLabel"
        defaultMessage="JSON"
      />
    ),
    content: (
      <JsonTab
        value={indicator as unknown as Record<string, unknown>}
        data-test-subj="indicators-flyout"
        isEmpty={Object.keys(indicator.fields).length === 0}
      />
    ),
  },
];
