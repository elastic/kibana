/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { useSecurityDefaultPatterns } from './use_security_default_patterns';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useSecurityDefaultPatterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the default data view', () => {
    const mockDataViews = [
      {
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        title: 'logs-*,metrics-*',
        name: 'default_view',
      },
      {
        id: 'custom-view-1',
        title: 'Custom View 1',
        name: 'custom_view_1',
      },
    ];

    (useSelector as jest.Mock).mockReturnValue({
      dataViews: mockDataViews,
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
    });

    const { result } = renderHook(() => useSecurityDefaultPatterns());
    expect(result.current).toEqual({
      id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      indexPatterns: ['logs-*', 'metrics-*'],
    });
  });

  it('should return empty id and index patterns if no default data view is found', () => {
    (useSelector as jest.Mock).mockReturnValue({
      dataViews: [],
      defaultDataViewId: null,
    });
    const { result } = renderHook(() => useSecurityDefaultPatterns());
    expect(result.current).toEqual({ id: '', indexPatterns: [] });
  });
});
