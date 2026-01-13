/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useRulesTableFilers } from './use_rules_table_filters';

describe('useRulesTableFilers', () => {
  let mockUrlStateStorage: jest.Mocked<IKbnUrlStateStorage>;
  let mockSetRefresh: jest.Mock;

  beforeEach(() => {
    mockSetRefresh = jest.fn();
    mockUrlStateStorage = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<IKbnUrlStateStorage>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with state from urlStateStorage', () => {
    const initialState = {
      lastResponse: ['success', 'failure'],
      params: { threshold: 100 },
      search: 'test search',
      status: ['enabled' as const],
      type: ['metric.threshold'],
    };

    mockUrlStateStorage.get.mockReturnValue(initialState);

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    expect(result.current.stateLastResponse).toEqual(initialState.lastResponse);
    expect(result.current.stateParams).toEqual(initialState.params);
    expect(result.current.stateSearch).toEqual(initialState.search);
    expect(result.current.stateStatus).toEqual(initialState.status);
    expect(result.current.stateType).toEqual(initialState.type);
  });

  it('should update status filter and persist to urlStateStorage', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.handleStatusFilterChange(['enabled', 'disabled']);
    });

    expect(result.current.stateStatus).toEqual(['enabled', 'disabled']);
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: [],
      params: {},
      search: '',
      status: ['enabled', 'disabled'],
      type: [],
    });
  });

  it('should update last run outcome filter, call setRefresh, and persist to urlStateStorage', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.handleLastRunOutcomeFilterChange(['success']);
    });

    expect(result.current.stateLastResponse).toEqual(['success']);
    expect(mockSetRefresh).toHaveBeenCalledWith(expect.any(Date));
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: ['success'],
      params: {},
      search: '',
      status: [],
      type: [],
    });
  });

  it('should update type filter and persist to urlStateStorage', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.handleTypeFilterChange([
        'slo.rules.burnRate',
        'observability.rules.custom_threshold',
      ]);
    });

    expect(result.current.stateType).toEqual([
      'slo.rules.burnRate',
      'observability.rules.custom_threshold',
    ]);
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: ['slo.rules.burnRate', 'observability.rules.custom_threshold'],
    });
  });

  it('should update search filter and persist to urlStateStorage', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.handleSearchFilterChange('my search query');
    });

    expect(result.current.stateSearch).toEqual('my search query');
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: [],
      params: {},
      search: 'my search query',
      status: [],
      type: [],
    });
  });

  it('should update rule param filter and persist to urlStateStorage', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    const newParams = { threshold: 50, window: '5m' };

    act(() => {
      result.current.handleRuleParamFilterChange(newParams);
    });

    expect(result.current.stateParams).toEqual(newParams);
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: [],
      params: newParams,
      search: '',
      status: [],
      type: [],
    });
  });

  it('should set rule ID to edit', () => {
    mockUrlStateStorage.get.mockReturnValue(null);

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.setRuleIdToEdit('rule-123');
    });

    expect(result.current.ruleIdToEdit).toEqual('rule-123');
  });

  it('should navigate to edit rule form by setting ruleId and opening flyout', () => {
    mockUrlStateStorage.get.mockReturnValue(null);

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.navigateToEditRuleForm('rule-456');
    });

    expect(result.current.ruleIdToEdit).toEqual('rule-456');
    expect(result.current.ruleConditionsFlyoutOpen).toBe(true);
  });

  it('should toggle rule conditions flyout', () => {
    mockUrlStateStorage.get.mockReturnValue(null);

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    expect(result.current.ruleConditionsFlyoutOpen).toBe(false);

    act(() => {
      result.current.setRuleConditionsFlyoutOpen(true);
    });

    expect(result.current.ruleConditionsFlyoutOpen).toBe(true);

    act(() => {
      result.current.setRuleConditionsFlyoutOpen(false);
    });

    expect(result.current.ruleConditionsFlyoutOpen).toBe(false);
  });

  it('should handle multiple filter changes sequentially and maintain state', () => {
    mockUrlStateStorage.get.mockReturnValue({
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: [],
    });

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    act(() => {
      result.current.handleSearchFilterChange('test');
    });

    act(() => {
      result.current.handleStatusFilterChange(['enabled']);
    });

    act(() => {
      result.current.handleTypeFilterChange(['metric.threshold']);
    });

    expect(result.current.stateSearch).toEqual('test');
    expect(result.current.stateStatus).toEqual(['enabled']);
    expect(result.current.stateType).toEqual(['metric.threshold']);

    // Each handler uses values from closure, so each call has its own snapshot
    expect(mockUrlStateStorage.set).toHaveBeenCalledTimes(3);
    expect(mockUrlStateStorage.set).toHaveBeenNthCalledWith(1, '_a', {
      lastResponse: [],
      params: {},
      search: 'test',
      status: [],
      type: [],
    });
    expect(mockUrlStateStorage.set).toHaveBeenNthCalledWith(2, '_a', {
      lastResponse: [],
      params: {},
      search: '',
      status: ['enabled'],
      type: [],
    });
    expect(mockUrlStateStorage.set).toHaveBeenNthCalledWith(3, '_a', {
      lastResponse: [],
      params: {},
      search: '',
      status: [],
      type: ['metric.threshold'],
    });
  });

  it('should handle complex params objects with nested properties', () => {
    mockUrlStateStorage.get.mockReturnValue(null);

    const { result } = renderHook(() =>
      useRulesTableFilers({
        urlStateStorage: mockUrlStateStorage,
        setRefresh: mockSetRefresh,
      })
    );

    const complexParams = {
      threshold: 100,
      comparator: '>',
      timeWindow: { size: 5, unit: 'm' },
      groupBy: ['host.name', 'service.name'],
    };

    act(() => {
      result.current.handleRuleParamFilterChange(complexParams);
    });

    expect(result.current.stateParams).toEqual(complexParams);
    expect(mockUrlStateStorage.set).toHaveBeenCalledWith('_a', {
      lastResponse: [],
      params: complexParams,
      search: '',
      status: [],
      type: [],
    });
  });
});
