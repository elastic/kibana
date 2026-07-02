/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getTabsDisplayed, validTabIds } from './tabs';
import {
  HEADER_JSON_TAB_TEST_ID,
  HEADER_OVERVIEW_TAB_TEST_ID,
  HEADER_TABLE_TAB_TEST_ID,
} from './constants/test_ids';

jest.mock('./tabs/overview_tab', () => ({
  OverviewTab: () => <div data-test-subj="overview-content" />,
}));

jest.mock('../../shared/tabs/table_tab', () => ({
  TableTab: () => <div data-test-subj="table-content" />,
}));

jest.mock('../../shared/tabs/json_tab', () => ({
  JsonTab: () => <div data-test-subj="json-content" />,
}));

const hit = {
  id: 'attack-1',
  raw: { _id: 'attack-1' },
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

describe('getTabsDisplayed', () => {
  it('returns the overview, table, and json tabs in order', () => {
    const tabs = getTabsDisplayed({ hit });

    expect(tabs.map((tab) => tab.id)).toEqual(['overview', 'table', 'json']);
  });

  it('assigns the expected test subjects to each tab', () => {
    const tabs = getTabsDisplayed({ hit });

    expect(tabs.map((tab) => tab['data-test-subj'])).toEqual([
      HEADER_OVERVIEW_TAB_TEST_ID,
      HEADER_TABLE_TAB_TEST_ID,
      HEADER_JSON_TAB_TEST_ID,
    ]);
  });

  it('renders the matching content for each tab', () => {
    const tabs = getTabsDisplayed({ hit });

    const { getByTestId } = render(<>{tabs.map((tab) => tab.content)}</>);

    expect(getByTestId('overview-content')).toBeInTheDocument();
    expect(getByTestId('table-content')).toBeInTheDocument();
    expect(getByTestId('json-content')).toBeInTheDocument();
  });

  it('validTabIds matches the rendered tab ids', () => {
    expect(validTabIds).toEqual(['overview', 'table', 'json']);
  });
});
