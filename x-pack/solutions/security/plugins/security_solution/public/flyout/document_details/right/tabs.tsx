/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import type { RightPanelPaths } from '.';
import { JsonTab } from './tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';

export interface RightPanelTabType {
  id: RightPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

export const overviewTab: RightPanelTabType = {
  id: 'overview',
  'data-test-subj': OVERVIEW_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.overviewTabLabel"
      defaultMessage="Overview"
    />
  ),
  content: <OverviewTab />,
};

export const tableTab: RightPanelTabType = {
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: <TableTab />,
};

export const jsonTab: RightPanelTabType = {
  id: 'json',
  'data-test-subj': JSON_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.jsonTabLabel"
      defaultMessage="JSON"
    />
  ),
  content: <JsonTab />,
};
