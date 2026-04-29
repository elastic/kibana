/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionsViewerPagination } from './pagination';

describe('ExceptionsViewerPagination', () => {
  it('it invokes "onPaginationChange" when per page item is clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerPagination
        pagination={{
          pageIndex: 0,
          pageSize: 50,
          totalItemCount: 1,
          pageSizeOptions: [20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    wrapper.find('button[data-test-subj="tablePaginationPopoverButton"]').at(0).simulate('click');
    wrapper.find('button[data-test-subj="tablePagination-50-rows"]').at(0).simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({ pagination: { page: 0, perPage: 50 } });
  });

  it('it invokes "onPaginationChange" when next clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerPagination
        pagination={{
          pageIndex: 0,
          pageSize: 5,
          totalItemCount: 160,
          pageSizeOptions: [5, 20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    wrapper.find('button[data-test-subj="pagination-button-next"]').at(0).simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({ pagination: { page: 1, perPage: 5 } });
  });

  it('it invokes "onPaginationChange" when page clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerPagination
        pagination={{
          pageIndex: 0,
          pageSize: 50,
          totalItemCount: 160,
          pageSizeOptions: [20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    wrapper.find('button[data-test-subj="pagination-button-2"]').simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({ pagination: { page: 2, perPage: 50 } });
  });
});
