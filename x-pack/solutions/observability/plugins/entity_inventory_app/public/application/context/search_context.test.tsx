/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { act, renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_TIME_RANGE } from '../constants';
import { INVALID_QUERY_TOAST_TITLE, TIME_RANGE_NOT_ALLOWED_TOAST_TITLE } from '../translations';
import { createPublicConfigMock } from '../../mocks';
import { EntityInventorySearchProvider, useEntityInventorySearch } from './search_context';

const renderSearchHook = (
  initialEntry = '/kubernetes',
  { timeRangeLimitDisabled = false } = {}
) => {
  const core = coreMock.createStart();
  const config = createPublicConfigMock({ timeRangeLimitDisabled });
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={{ ...core, config }}>
      <Router history={history}>
        <EntityInventorySearchProvider entityCategory="kubernetes">
          {children}
        </EntityInventorySearchProvider>
      </Router>
    </KibanaContextProvider>
  );

  return { core, history, ...renderHook(() => useEntityInventorySearch(), { wrapper }) };
};

const kuery = (query: string) => ({ language: 'kuery', query });

describe('EntityInventorySearchProvider', () => {
  it('exposes the default search state and the entity category', () => {
    const { result } = renderSearchHook();

    expect(result.current.entityCategory).toBe('kubernetes');
    expect(result.current.query).toEqual(kuery(''));
    expect(result.current.filters).toEqual([]);
    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
    expect(result.current.filterControls).toEqual({ attributes: {} });
    expect(result.current.isTimeRangeLimited).toBe(true);
  });

  it('keeps the filter selection of the page', () => {
    const { result } = renderSearchHook();

    act(() => {
      result.current.setFilterControls({
        type: 'k8s.pod',
        attributes: { 'k8s.pod.phase': ['Running'] },
      });
    });

    expect(result.current.filterControls).toEqual({
      type: 'k8s.pod',
      attributes: { 'k8s.pod.phase': ['Running'] },
    });
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

  describe('a submitted time range that is not allowed', () => {
    it.each([
      ['longer than the maximum', { from: 'now-7d', to: 'now' }],
      ['shorter, but starting earlier than the maximum', { from: 'now-10d', to: 'now-9d' }],
    ])(
      'keeps the previous range, leaves the URL alone and warns once when it is %s',
      (_, range) => {
        const { result, core, history } = renderSearchHook();
        const searchBefore = history.location.search;
        let committed;

        act(() => {
          committed = result.current.submit({ dateRange: range });
        });

        expect(committed).toEqual(DEFAULT_TIME_RANGE);
        expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
        expect(history.location.search).toBe(searchBefore);
        expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
        expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
          title: TIME_RANGE_NOT_ALLOWED_TOAST_TITLE,
        });
      }
    );

    it('does not ask for a refresh', () => {
      const { result } = renderSearchHook();
      const tokenBefore = result.current.refreshToken;

      act(() => {
        result.current.submit({ dateRange: { from: 'now-7d', to: 'now' } });
      });

      expect(result.current.refreshToken).toBe(tokenBefore);
    });

    it('still commits a valid query submitted with it', () => {
      const { result } = renderSearchHook();

      act(() => {
        result.current.submit({
          dateRange: { from: 'now-7d', to: 'now' },
          query: kuery('host.name:a'),
        });
      });

      expect(result.current.query).toEqual(kuery('host.name:a'));
      expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
    });
  });

  it('keeps the previous range without a warning when the submitted range is invalid', () => {
    const { result, core } = renderSearchHook();
    const tokenBefore = result.current.refreshToken;
    let committed;

    act(() => {
      committed = result.current.submit({ dateRange: { from: 'now-5x', to: 'now' } });
    });

    expect(committed).toEqual(DEFAULT_TIME_RANGE);
    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
    expect(result.current.refreshToken).toBe(tokenBefore);
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('asks for a refresh when a valid range is submitted', () => {
    const { result } = renderSearchHook();
    const tokenBefore = result.current.refreshToken;

    act(() => {
      result.current.submit({ dateRange: { from: 'now-1h', to: 'now' } });
    });

    expect(result.current.refreshToken).toBe(tokenBefore + 1);
  });

  it('commits a submission over the maximum time range as-is when the limit is disabled', () => {
    const { result, core } = renderSearchHook(undefined, { timeRangeLimitDisabled: true });
    const dateRange = { from: 'now-30d', to: 'now' };
    let committed;

    act(() => {
      committed = result.current.submit({ dateRange });
    });

    expect(result.current.isTimeRangeLimited).toBe(false);
    expect(committed).toEqual(dateRange);
    expect(result.current.dateRange).toEqual(dateRange);
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('keeps the previous time range for invalid datemath when the limit is disabled', () => {
    const { result } = renderSearchHook(undefined, { timeRangeLimitDisabled: true });
    let committed;

    act(() => {
      committed = result.current.submit({ dateRange: { from: 'now-5x', to: 'now' } });
    });

    expect(committed).toEqual(DEFAULT_TIME_RANGE);
    expect(result.current.dateRange).toEqual(DEFAULT_TIME_RANGE);
  });

  it('does not commit invalid KQL, surfaces an error and still commits the time range', () => {
    const { result, core } = renderSearchHook();
    let committed;

    act(() => {
      committed = result.current.submit({
        dateRange: { from: 'now-1h', to: 'now' },
        query: kuery('foo:'),
      });
    });

    expect(committed).toEqual({ from: 'now-1h', to: 'now' });
    expect(result.current.query).toEqual(kuery(''));
    expect(result.current.dateRange).toEqual({ from: 'now-1h', to: 'now' });
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

    expect(result.current.filters).toEqual(filters);
  });

  it('changes the refresh token on every submit, even for the same search', () => {
    const { result } = renderSearchHook();
    const submission = { dateRange: { from: 'now-1h', to: 'now' }, query: kuery('host.name:a') };
    const initialToken = result.current.refreshToken;

    act(() => {
      result.current.submit(submission);
    });
    const tokenAfterFirstSubmit = result.current.refreshToken;
    act(() => {
      result.current.submit(submission);
    });

    expect(tokenAfterFirstSubmit).not.toBe(initialToken);
    expect(result.current.refreshToken).not.toBe(tokenAfterFirstSubmit);
  });

  it('throws a descriptive error when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useEntityInventorySearch())).toThrow(
      'useEntityInventorySearch must be used within an EntityInventorySearchProvider'
    );
  });

  describe('URL state', () => {
    it('writes the committed state to the _a parameter', () => {
      const { result, history } = renderSearchHook();

      act(() => {
        result.current.submit({
          dateRange: { from: 'now-1h', to: 'now' },
          query: kuery('host.name:a'),
        });
      });

      expect(history.location.search).toContain('_a=');
      expect(history.location.search).toContain('host.name');
    });

    it('restores the state it wrote when the page loads again', () => {
      const first = renderSearchHook();
      act(() => {
        first.result.current.submit({
          dateRange: { from: 'now-1h', to: 'now' },
          query: kuery('host.name:a'),
        });
        first.result.current.setFilterControls({ attributes: { 'os.type': ['linux'] } });
      });

      const second = renderSearchHook(`/kubernetes${first.history.location.search}`);

      expect(second.result.current.dateRange).toEqual({ from: 'now-1h', to: 'now' });
      expect(second.result.current.query).toEqual(kuery('host.name:a'));
      expect(second.result.current.filterControls).toEqual({
        attributes: { 'os.type': ['linux'] },
      });
    });
  });
});
