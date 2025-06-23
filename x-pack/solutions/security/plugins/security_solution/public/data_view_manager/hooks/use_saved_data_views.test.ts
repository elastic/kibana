/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { useSavedDataViews } from './use_saved_data_views';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../../common/constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useSavedDataViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out the default data view and transform the remaining ones', () => {
    // Mock data to be returned by the selector
    const mockDataViews = [
      {
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, // This should be filtered out
        title: 'Default View',
        name: 'default_view',
      },
      {
        id: DEFAULT_ALERT_DATA_VIEW_ID, // This should be filtered out
        title: 'Default Alert View',
        name: 'default_alert_view',
      },
      {
        id: 'custom-view-1',
        title: 'Custom View 1',
        name: 'custom_view_1',
      },
      {
        id: 'custom-view-2',
        title: 'Custom View 2',
        name: 'custom_view_2',
      },
    ];

    // Mock the useSelector to return our test data
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: mockDataViews,
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
    });

    // Render the hook
    const { result } = renderHook(() => useSavedDataViews());

    // Expect the default view to be filtered out
    expect(result.current).toHaveLength(2);
    expect(
      result.current.find((item) => item.id === DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID)
    ).toBeUndefined();
    expect(result.current.find((item) => item.id === DEFAULT_ALERT_DATA_VIEW_ID)).toBeUndefined();

    // Expect the custom views to be correctly transformed
    expect(result.current).toEqual([
      {
        id: 'custom-view-1',
        title: 'Custom View 1',
        name: 'custom_view_1',
      },
      {
        id: 'custom-view-2',
        title: 'Custom View 2',
        name: 'custom_view_2',
      },
    ]);
  });

  it('should handle empty data views array', () => {
    // Mock the useSelector to return an empty array
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: [],
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
    });

    // Render the hook
    const { result } = renderHook(() => useSavedDataViews());

    // Expect an empty array
    expect(result.current).toEqual([]);
  });

  it('should handle data views with missing properties', () => {
    // Mock data with missing properties
    const mockDataViews = [
      {
        // Missing id
        title: 'View with missing id',
        name: 'view_missing_id',
      },
      {
        id: 'missing-title',
        // Missing title
        name: 'missing_title',
      },
    ];

    // Mock the useSelector
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: mockDataViews,
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
    });

    // Render the hook
    const { result } = renderHook(() => useSavedDataViews());

    // Expect views to be included with proper fallbacks
    expect(result.current).toEqual([
      {
        id: '', // Default to empty string
        title: 'View with missing id',
        name: 'view_missing_id',
      },
      {
        id: 'missing-title',
        title: '', // Default to empty string
        name: 'missing_title',
      },
    ]);
  });
});
