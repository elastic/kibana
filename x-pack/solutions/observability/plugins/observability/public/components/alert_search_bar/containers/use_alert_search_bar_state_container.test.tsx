/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import { useContainer } from './state_container';
import { useTimefilterService } from '../../../hooks/use_timefilter_service';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { PublicAlertStatus } from '@kbn/rule-data-utils';

const MOCK_DEFAULT_STATE = {
  rangeFrom: 'now-30m',
  rangeTo: 'now',
  kuery: '',
  status: 'all' as PublicAlertStatus,
  filters: [],
  controlConfigs: [],
  groupings: [],
};

jest.mock('../../../hooks/use_timefilter_service', () => ({
  useTimefilterService: jest.fn(),
}));

jest.mock('@kbn/kibana-utils-plugin/public', () => ({
  createKbnUrlStateStorage: jest.fn(),
  syncState: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  useContainerSelector: jest.fn(() => {
    return MOCK_DEFAULT_STATE;
  }),
  createStateContainer: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    state$: { subscribe: jest.fn() },
    transitions: {
      setRangeFrom: jest.fn(),
      setRangeTo: jest.fn(),
      setKuery: jest.fn(),
      setStatus: jest.fn(),
      setFilters: jest.fn(),
      setSavedQueryId: jest.fn(),
      setControlConfigs: jest.fn(),
      setGroupings: jest.fn(),
    },
  })),
  createStateContainerReactHelpers: jest.fn(() => ({
    useContainer: jest.fn(),
  })),
}));

describe('useAlertSearchBarStateContainer', () => {
  const mockSet = jest.fn();
  const mockTransitions = {
    setRangeFrom: jest.fn(),
    setRangeTo: jest.fn(),
    setKuery: jest.fn(),
    setStatus: jest.fn(),
    setFilters: jest.fn(),
    setSavedQueryId: jest.fn(),
    setControlConfigs: jest.fn(),
    setGroupings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useContainer as jest.Mock).mockReturnValue({
      transitions: mockTransitions,
      set: mockSet,
    });
    (useTimefilterService as jest.Mock).mockReturnValue({
      getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
      isTimeTouched: jest.fn(() => false),
    });
    (createKbnUrlStateStorage as jest.Mock).mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      kbnUrlControls: { flush: jest.fn() },
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(
      () => useAlertSearchBarStateContainer('testKey', { replace: true }, MOCK_DEFAULT_STATE),
      { wrapper: MemoryRouter }
    );

    expect(result.current.rangeFrom).toBe('now-30m');
    expect(result.current.rangeTo).toBe('now');
    expect(result.current.kuery).toBe('');
    expect(result.current.status).toBe('all');
  });

  it('should update kuery when onKueryChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    act(() => {
      result.current.onKueryChange('newKuery');
    });

    expect(mockTransitions.setKuery).toHaveBeenCalledWith('newKuery');
  });

  it('should update rangeFrom when onRangeFromChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    act(() => {
      result.current.onRangeFromChange('now-1h');
    });

    expect(mockTransitions.setRangeFrom).toHaveBeenCalledWith('now-1h');
  });

  it('should update rangeTo when onRangeToChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    act(() => {
      result.current.onRangeToChange('now');
    });

    expect(mockTransitions.setRangeTo).toHaveBeenCalledWith('now');
  });

  it('should update status when onStatusChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    act(() => {
      result.current.onStatusChange('active');
    });

    expect(mockTransitions.setStatus).toHaveBeenCalledWith('active');
  });

  it('should update filters when onFiltersChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    const newFilters = [{ meta: { key: 'test' } }];
    act(() => {
      result.current.onFiltersChange(newFilters);
    });

    expect(mockTransitions.setFilters).toHaveBeenCalledWith(newFilters);
  });

  it('should update controlConfigs when onControlConfigsChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    const newControlConfigs = [{ data_view_id: 'test-view', field_name: 'host.name' }];
    act(() => {
      result.current.onControlConfigsChange(newControlConfigs);
    });

    expect(mockTransitions.setControlConfigs).toHaveBeenCalledWith(newControlConfigs);
  });

  it('should update groupings when onGroupingsChange is called', () => {
    const { result } = renderHook(() => useAlertSearchBarStateContainer('testKey'), {
      wrapper: MemoryRouter,
    });

    const newGroupings = ['group1', 'group2'];
    act(() => {
      result.current.onGroupingsChange(newGroupings);
    });

    expect(mockTransitions.setGroupings).toHaveBeenCalledWith(newGroupings);
  });
});
