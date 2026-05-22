/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useTabs } from './use_tabs';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('useTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { storage: mockStorage },
    });
  });

  it('should default to overview tab', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useTabs({}));
    expect(result.current.selectedTabId).toBe('overview');
  });

  it('should use initialTabId when provided', () => {
    const { result } = renderHook(() => useTabs({ initialTabId: 'table' }));
    expect(result.current.selectedTabId).toBe('table');
  });

  it('should ignore invalid initialTabId', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useTabs({ initialTabId: 'invalid' }));
    expect(result.current.selectedTabId).toBe('overview');
  });

  it('should use tab from localStorage when no initialTabId', () => {
    mockStorage.get.mockReturnValue('json');
    const { result } = renderHook(() => useTabs({}));
    expect(result.current.selectedTabId).toBe('json');
  });

  it('should update selected tab and localStorage when setSelectedTabId is called', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useTabs({}));

    act(() => {
      result.current.setSelectedTabId('table');
    });

    expect(result.current.selectedTabId).toBe('table');
    expect(mockStorage.set).toHaveBeenCalledWith(
      'securitySolution.iocDetailsFlyout.rightPanel.selectedTabs',
      'table'
    );
  });
});
