/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { ExploreTables } from '../analytics_collection_explore_table_types';

import { AnalyticsCollectionExplorerTable } from './analytics_collection_explorer_table';

describe('AnalyticsCollectionExplorerTable', () => {
  const mockActions = {
    onTableChange: jest.fn(),
    setPageIndex: jest.fn(),
    setPageSize: jest.fn(),
    setSearch: jest.fn(),
    setSelectedTable: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockValues({ items: [], selectedTable: ExploreTables.Clicked });
    setMockActions(mockActions);
  });

  it('should set default selectedTable', () => {
    setMockValues({ items: [], selectedTable: null });
    const wrapper = mount(<AnalyticsCollectionExplorerTable />);

    wrapper.update();

    expect(mockActions.setSelectedTable).toHaveBeenCalledWith(ExploreTables.SearchTerms, {
      direction: 'desc',
      field: 'count',
    });
  });

  it('should call setSelectedTable when click on a tab', () => {
    const tabs = shallow(<AnalyticsCollectionExplorerTable />).find('EuiTab');

    expect(tabs.length).toBe(5);

    tabs.at(2).simulate('click');
    expect(mockActions.setSelectedTable).toHaveBeenCalledWith(ExploreTables.WorsePerformers, {
      direction: 'desc',
      field: 'count',
    });
  });

  it('should call onTableChange when table called onChange', () => {
    const table = shallow(<AnalyticsCollectionExplorerTable />).find('EuiBasicTable');

    table.simulate('change', {
      page: { index: 23, size: 44 },
      sort: { direction: 'asc', field: 'test' },
    });
    expect(mockActions.onTableChange).toHaveBeenCalledWith({
      page: { index: 23, size: 44 },
      sort: { direction: 'asc', field: 'test' },
    });
  });
});
