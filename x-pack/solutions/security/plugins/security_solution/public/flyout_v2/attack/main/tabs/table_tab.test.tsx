/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataTableRecord } from '@kbn/discover-utils';

import { TableTab } from './table_tab';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from '../constants/test_ids';
import { TestProviders } from '../../../../common/mock';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';

jest.mock('../../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));

jest.mock('../../../document/main/utils/get_timeline_events_details_from_record', () => ({
  getTimelineEventsDetailsFromRecord: () => [],
}));

jest.mock('../utils/table_tab_items', () => ({
  getTableTabItems: jest.fn().mockReturnValue([
    {
      field: 'title',
      values: ['Test attack title'],
      type: 'string',
      isObjectArray: false,
    },
  ]),
}));

jest.mock('../components/table_field_value_cell', () => ({
  TableFieldValueCell: ({ values }: { values: string[] | null | undefined }) => (
    <span>{Array.isArray(values) ? values.join(', ') : values}</span>
  ),
}));

const hit = { id: 'test-attack-id' } as unknown as DataTableRecord;

const renderTableTab = () =>
  render(
    <TestProviders>
      <TableTab hit={hit} renderCellActions={noopCellActionRenderer} />
    </TestProviders>
  );

describe('<TableTab /> (attack details)', () => {
  it('renders the table component', () => {
    const { getByTestId } = renderTableTab();

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('renders the column headers and a field/value pair', () => {
    const { getByText } = renderTableTab();

    // headers from getTableTabColumns()
    expect(getByText('Field')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();

    // row from mocked getTableTabItems
    expect(getByText('title')).toBeInTheDocument();
    expect(getByText('Test attack title')).toBeInTheDocument();
  });

  it('filters the table correctly via the search input', async () => {
    const user = userEvent.setup();
    const { getByTestId, queryByText } = renderTableTab();

    // sanity check: row is initially visible
    expect(queryByText('title')).toBeInTheDocument();
    expect(queryByText('Test attack title')).toBeInTheDocument();

    // type some term that should filter out the row
    await user.type(getByTestId(TABLE_TAB_SEARCH_INPUT_TEST_ID), 'something-not-matching');

    expect(queryByText('title')).not.toBeInTheDocument();
    expect(queryByText('Test attack title')).not.toBeInTheDocument();
  });
});
