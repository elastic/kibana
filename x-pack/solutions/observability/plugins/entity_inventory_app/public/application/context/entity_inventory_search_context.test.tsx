/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_TIME_RANGE } from '../constants';
import { INVALID_QUERY_TOAST_TITLE, TIME_RANGE_CLAMPED_TOAST_TITLE } from '../translations';
import {
  EntityInventorySearchProvider,
  useEntityInventorySearch,
} from './entity_inventory_search_context';

const renderSearchHook = () => {
  const core = coreMock.createStart();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <EntityInventorySearchProvider entityType="kubernetes">
        {children}
      </EntityInventorySearchProvider>
    </KibanaContextProvider>
  );

  return { core, ...renderHook(() => useEntityInventorySearch(), { wrapper }) };
};

const kuery = (query: string) => ({ language: 'kuery', query });

describe('EntityInventorySearchProvider', () => {
  it('exposes the default search state and the entity type', () => {
    const { result } = renderSearchHook();

    expect(result.current.entityType).toBe('kubernetes');
    expect(result.current.query).toEqual(kuery(''));
    expect(result.current.filters).toEqual([]);
    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
  });

  it('commits a submission within the maximum time range as-is', () => {
    const { result, core } = renderSearchHook();
    const dateRange = { from: 'now-1d', to: 'now' };

    act(() => {
      result.current.submit({ dateRange, query: kuery('host.name:a') });
    });

    expect(result.current.dateRange).toEqual(dateRange);
    expect(result.current.query).toEqual(kuery('host.name:a'));
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('clamps a submission over the maximum time range and warns once', () => {
    const { result, core } = renderSearchHook();
    let committed;

    act(() => {
      committed = result.current.submit({ dateRange: { from: 'now-7d', to: 'now' } });
    });

    expect(result.current.dateRange).toEqual({ from: 'now-3d', to: 'now' });
    expect(committed).toEqual({ from: 'now-3d', to: 'now' });
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
      title: TIME_RANGE_CLAMPED_TOAST_TITLE,
    });
  });

  it('rejects invalid KQL without committing and surfaces an error', () => {
    const { result, core } = renderSearchHook();
    let committed;

    act(() => {
      committed = result.current.submit({
        dateRange: { from: 'now-1h', to: 'now' },
        query: kuery('foo:'),
      });
    });

    expect(committed).toBeUndefined();
    expect(result.current.query).toEqual(kuery(''));
    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: INVALID_QUERY_TOAST_TITLE,
    });
  });

  it('keeps the previous time range when the submitted datemath is invalid', () => {
    const { result } = renderSearchHook();
    let committed;

    act(() => {
      committed = result.current.submit({
        dateRange: { from: 'now-5x', to: 'now' },
        query: kuery('host.name:a'),
      });
    });

    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
    expect(committed).toEqual(DEFAULT_TIME_RANGE);
    expect(result.current.query).toEqual(kuery('host.name:a'));
  });

  it('updates filters', () => {
    const { result } = renderSearchHook();
    const filters: Filter[] = [{ meta: { key: 'host.name' }, query: { match_all: {} } }];

    act(() => {
      result.current.setFilters(filters);
    });

    expect(result.current.filters).toBe(filters);
  });

  it('throws a descriptive error when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useEntityInventorySearch())).toThrow(
      'useEntityInventorySearch must be used within an EntityInventorySearchProvider'
    );
  });
});
