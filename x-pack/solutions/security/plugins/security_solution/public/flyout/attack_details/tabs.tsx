/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDetailsPanelPaths } from '.';
import { OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID, JSON_TAB_TEST_ID } from './constants/test_ids';
import { TableTab } from './tabs/table_tab';

export interface AttackDetailsPanelTabType {
  id: AttackDetailsPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

export const overviewTab: AttackDetailsPanelTabType = {
  id: 'overview',
  'data-test-subj': OVERVIEW_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.overviewTabLabel"
      defaultMessage="Overview"
    />
  ),
  content: <div>{`${OVERVIEW_TAB_TEST_ID}`}</div>,
};

export const tableTab: AttackDetailsPanelTabType = {
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: <TableTab />,
};

export const jsonTab: AttackDetailsPanelTabType = {
  id: 'json',
  'data-test-subj': JSON_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.jsonTabLabel"
      defaultMessage="JSON"
    />
  ),
  content: <div>{`${JSON_TAB_TEST_ID}`}</div>,
};
