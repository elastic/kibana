/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useManagedDataViews } from './use_managed_data_views';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../../common/constants';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/data-views-plugin/public', () => ({
  DataView: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { useKibana } from '../../common/lib/kibana';

describe('useManagedDataViews', () => {
  const mockFieldFormats = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DataView constructor
    (DataView as jest.Mock).mockImplementation(({ spec }) => ({
      ...spec,
    }));

    // Mock useKibana
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        fieldFormats: mockFieldFormats,
      },
    });
  });

  it('should filter data views to only include those with DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID', () => {
    // Create mock data views with a mix of IDs
    const mockDataViews = [
      { id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, title: 'Security solution data view' },
      { id: 'some-other-id', title: 'Other data view' },
      { id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, title: 'Another security solution data view' },
      { id: DEFAULT_ALERT_DATA_VIEW_ID, title: 'Security alert data view' },
    ];

    // Mock the Redux selector
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: mockDataViews,
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
    });

    // Render the hook
    const { result } = renderHook(() => useManagedDataViews());

    // Expect only data views with matching ID to be included
    expect(result.current.length).toBe(3);

    // Verify the IDs of the filtered data views
    result.current.forEach((dataView, i) => {
      if (i <= 1) {
        expect(dataView.id).toBe(DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID);
      } else {
        expect(dataView.id).toBe(DEFAULT_ALERT_DATA_VIEW_ID);
      }
    });

    // Verify DataView constructor was called with correct arguments
    expect(DataView).toHaveBeenCalledTimes(3);
    expect(DataView).toHaveBeenCalledWith({
      spec: mockDataViews[0],
      fieldFormats: mockFieldFormats,
    });
    expect(DataView).toHaveBeenCalledWith({
      spec: mockDataViews[2],
      fieldFormats: mockFieldFormats,
    });
    expect(DataView).toHaveBeenCalledWith({
      spec: mockDataViews[3],
      fieldFormats: mockFieldFormats,
    });
  });

  it('should return an empty array when no data views match the filter criteria', () => {
    // Create mock data views with no matching IDs
    const mockDataViews = [
      { id: 'some-id', title: 'Some Data View' },
      { id: 'another-id', title: 'Another Data View' },
    ];
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: mockDataViews,
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
    });

    const { result } = renderHook(() => useManagedDataViews());

    // Expect no data views to be included
    expect(result.current).toEqual([]);
    expect(result.current.length).toBe(0);

    // Verify DataView constructor was not called
    expect(DataView).not.toHaveBeenCalled();
  });
});
