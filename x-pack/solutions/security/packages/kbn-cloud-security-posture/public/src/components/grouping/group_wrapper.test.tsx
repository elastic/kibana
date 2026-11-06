/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { useGrouping } from '@kbn/grouping';
import { GroupWrapper } from './group_wrapper';

describe('GroupWrapper', () => {
  const mockGetGrouping = jest.fn((props: Record<string, unknown>) => (
    <div data-test-subj="mock-grouping-content">
      {`isLoading:${props.isLoading} activePage:${props.activePage}`}
    </div>
  ));

  const mockGrouping = {
    getGrouping: mockGetGrouping,
    groupSelector: <div />,
    selectedGroups: ['host.name'],
    setSelectedGroups: jest.fn(),
  } as unknown as ReturnType<typeof useGrouping>;

  const baseProps = {
    renderChildComponent: () => <></>,
    grouping: mockGrouping,
    activePageIndex: 0,
    pageSize: 25,
    onChangeGroupsItemsPerPage: jest.fn(),
    onChangeGroupsPage: jest.fn(),
    selectedGroup: 'host.name',
  };

  beforeEach(() => {
    mockGetGrouping.mockClear();
  });

  it('renders the loading placeholder before any data has ever loaded', () => {
    render(<GroupWrapper {...baseProps} data={{}} isFetching />);

    expect(screen.getByTestId('cloud-security-grouping-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('cloud-security-grouping')).not.toBeInTheDocument();
  });

  it('renders the real content once data has loaded', () => {
    render(
      <GroupWrapper
        {...baseProps}
        data={{ groupsCount: { value: 5 }, unitsCount: { value: 10 } }}
        isFetching={false}
      />
    );

    expect(screen.getByTestId('cloud-security-grouping')).toBeInTheDocument();
    expect(screen.queryByTestId('cloud-security-grouping-loading')).not.toBeInTheDocument();
  });

  it('keeps rendering the real content (with isLoading passed through) during a refetch instead of swapping back to the placeholder', () => {
    const dataWithCount = { groupsCount: { value: 5 }, unitsCount: { value: 10 } };

    const { rerender } = render(
      <GroupWrapper {...baseProps} data={dataWithCount} isFetching={false} activePageIndex={3} />
    );

    expect(screen.getByTestId('cloud-security-grouping')).toBeInTheDocument();

    // simulate a refetch (e.g. a page change) where keepPreviousData keeps the previous
    // aggregation around while isFetching flips to true
    rerender(<GroupWrapper {...baseProps} data={dataWithCount} isFetching activePageIndex={3} />);

    // real content stays mounted - it does not get torn down for the placeholder, which would
    // reset any in-progress UI state (expanded groups, revealed pagination pages)
    expect(screen.getByTestId('cloud-security-grouping')).toBeInTheDocument();
    expect(screen.queryByTestId('cloud-security-grouping-loading')).not.toBeInTheDocument();
    expect(mockGetGrouping).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLoading: true, activePage: 3, data: dataWithCount })
    );
  });
});
