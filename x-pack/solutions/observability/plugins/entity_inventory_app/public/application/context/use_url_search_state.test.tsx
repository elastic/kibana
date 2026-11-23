/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { act, renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { decode } from '@kbn/rison';
import { DEFAULT_TIME_RANGE, ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../constants';
import { TIME_RANGE_CLAMPED_TOAST_TITLE } from '../translations';
import type { UrlSearchState } from './use_url_search_state';
import { useUrlSearchState } from './use_url_search_state';

const kuery = (query: string) => ({ language: 'kuery', query });

const DEFAULT_STATE = {
  dateRange: DEFAULT_TIME_RANGE,
  query: kuery(''),
  filters: [],
  filterControls: { attributes: {} },
};

const readWrittenState = (history: MemoryHistory) =>
  decode(
    new URLSearchParams(history.location.search).get('_a') ?? ''
  ) as unknown as Partial<UrlSearchState>;

const renderUrlState = (
  initialEntry = '/kubernetes',
  { maxDays = ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } = {}
) => {
  const core = coreMock.createStart();
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const seen: UrlSearchState[] = [];
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <Router history={history}>{children}</Router>
    </KibanaContextProvider>
  );
  const hook = renderHook(
    () => {
      const value = useUrlSearchState({ maxDays });
      seen.push(value[0]);
      return value;
    },
    { wrapper }
  );

  return { core, history, seen, ...hook };
};

describe('useUrlSearchState', () => {
  describe('first load', () => {
    it('starts with the default state', () => {
      const { result } = renderUrlState();
      const [state] = result.current;

      expect(state.dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(state.query).toEqual(kuery(''));
      expect(state.filters).toEqual([]);
      expect(state.filterControls).toEqual({ attributes: {} });
    });

    it('writes the default state to the _a parameter', () => {
      const { history } = renderUrlState();

      expect(readWrittenState(history)).toEqual(DEFAULT_STATE);
    });

    it('keeps the same state objects after the default state is written', () => {
      const { seen } = renderUrlState();

      expect(seen.length).toBeGreaterThan(1);
      seen.forEach((state) => {
        expect(state.dateRange).toBe(seen[0].dateRange);
        expect(state.query).toBe(seen[0].query);
        expect(state.filters).toBe(seen[0].filters);
        expect(state.filterControls).toBe(seen[0].filterControls);
      });
    });

    it('keeps the same state objects when an unrelated parameter changes', () => {
      const { result, history } = renderUrlState();
      const [before] = result.current;

      act(() => {
        history.replace({ ...history.location, search: `${history.location.search}&other=value` });
      });

      const [after] = result.current;
      expect(after.dateRange).toBe(before.dateRange);
      expect(after.query).toBe(before.query);
      expect(after.filters).toBe(before.filters);
      expect(after.filterControls).toBe(before.filterControls);
    });

    it('replaces an invalid _a parameter with the default state', () => {
      const { result, history } = renderUrlState('/kubernetes?_a=(dateRange:foo)');
      const [state] = result.current;

      expect(state.dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(state.query).toEqual(kuery(''));
      expect(state.filters).toEqual([]);
      expect(state.filterControls).toEqual({ attributes: {} });
      expect(readWrittenState(history)).toEqual(DEFAULT_STATE);
    });
  });

  describe('update', () => {
    it('changes only the given part of the state', () => {
      const { result } = renderUrlState();

      act(() => {
        result.current[1]({ filterControls: { attributes: { 'os.type': ['linux'] } } });
      });

      const [state] = result.current;
      expect(state.filterControls).toEqual({ attributes: { 'os.type': ['linux'] } });
      expect(state.dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(state.query).toEqual(kuery(''));
    });

    it('keeps the other query parameters when it writes', () => {
      const { result, history } = renderUrlState('/kubernetes?other=value');

      act(() => {
        result.current[1]({ filterControls: { attributes: { 'os.type': ['linux'] } } });
      });

      expect(history.location.search).toContain('other=value');
      expect(history.location.search).toContain('_a=');
    });

    it('restores what it wrote when the page loads again', () => {
      const first = renderUrlState();
      act(() => {
        first.result.current[1]({
          dateRange: { from: 'now-1h', to: 'now' },
          query: kuery('host.name:a'),
          filterControls: { attributes: { 'os.type': ['linux'] } },
        });
      });

      const second = renderUrlState(`/kubernetes${first.history.location.search}`);
      const [state] = second.result.current;

      expect(state.dateRange).toEqual({ from: 'now-1h', to: 'now' });
      expect(state.query).toEqual(kuery('host.name:a'));
      expect(state.filterControls).toEqual({ attributes: { 'os.type': ['linux'] } });
    });
  });

  describe('reading the URL', () => {
    it('limits a time range from the URL to the last 3 days, writes it back and warns once', () => {
      const { result, history, core } = renderUrlState(
        '/kubernetes?_a=(dateRange:(from:now-30d,to:now))'
      );

      expect(result.current[0].dateRange).toEqual({ from: 'now-3d', to: 'now' });
      expect(readWrittenState(history).dateRange).toEqual({ from: 'now-3d', to: 'now' });
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: TIME_RANGE_CLAMPED_TOAST_TITLE,
      });
    });

    it('turns a window older than the maximum into the last 3 days', () => {
      const { result, history } = renderUrlState(
        '/kubernetes?_a=(dateRange:(from:now-10d,to:now-9d))'
      );

      expect(result.current[0].dateRange).toEqual({ from: 'now-3d', to: 'now' });
      expect(readWrittenState(history).dateRange).toEqual({ from: 'now-3d', to: 'now' });
    });

    it('uses the default range, without a warning, when the range in the URL is invalid', () => {
      const { result, history, core } = renderUrlState(
        '/kubernetes?_a=(dateRange:(from:now-5x,to:now))'
      );

      expect(result.current[0].dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(readWrittenState(history).dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    });

    it('writes an invalid query back as the default one, without a warning', () => {
      const { history, core } = renderUrlState(
        "/kubernetes?_a=(query:(language:kuery,query:'foo:'),dateRange:(from:now-1h,to:now))"
      );

      expect(readWrittenState(history).query).toEqual(kuery(''));
      expect(readWrittenState(history).dateRange).toEqual({ from: 'now-1h', to: 'now' });
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    });

    it('drops a filter whose metadata has the wrong types and keeps the others', () => {
      const { result, history } = renderUrlState(
        '/kubernetes?_a=(filters:!((meta:(alias:(a:b)),query:(match_all:())),(meta:(alias:foo),query:(match_all:())),(meta:(alias:!n),query:(match_all:()))))'
      );

      const expected = [
        { meta: { alias: 'foo' }, query: { match_all: {} } },
        { meta: { alias: null }, query: { match_all: {} } },
      ];
      expect(result.current[0].filters).toEqual(expected);
      expect(readWrittenState(history).filters).toEqual(expected);
    });

    it.each([
      ['negate', '(meta:(negate:yes),query:(match_all:()))'],
      ['disabled', '(meta:(disabled:1),query:(match_all:()))'],
    ])('drops a filter whose %s has the wrong type', (_, filter) => {
      const { result } = renderUrlState(`/kubernetes?_a=(filters:!(${filter}))`);

      expect(result.current[0].filters).toEqual([]);
    });

    it('keeps a filter with metadata that the filter bar does not draw', () => {
      const { result } = renderUrlState(
        '/kubernetes?_a=(filters:!((meta:(key:host.name,type:phrase,negate:!t),query:(match_all:()))))'
      );

      expect(result.current[0].filters).toEqual([
        { meta: { key: 'host.name', type: 'phrase', negate: true }, query: { match_all: {} } },
      ]);
    });

    it('writes a URL without the filters that cannot be built', () => {
      const { history } = renderUrlState(
        '/kubernetes?_a=(filters:!((meta:(type:combined))),dateRange:(from:now-1h,to:now))'
      );

      expect(readWrittenState(history).filters).toEqual([]);
    });

    it.each([
      ['a valid URL', '/kubernetes?_a=(dateRange:(from:now-1h,to:now))'],
      [
        'a URL that only misses parts of the state',
        '/kubernetes?_a=(filterControls:(attributes:(os.type:!(linux))))',
      ],
    ])('does not rewrite %s', (_, entry) => {
      const { history, core } = renderUrlState(entry);

      expect(`/kubernetes${history.location.search}`).toBe(entry);
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    });

    it('keeps a time range from the URL over the maximum when the limit is disabled', () => {
      const entry = '/kubernetes?_a=(dateRange:(from:now-30d,to:now))';
      const { result, history, core } = renderUrlState(entry, { maxDays: Infinity });

      expect(result.current[0].dateRange).toEqual({ from: 'now-30d', to: 'now' });
      expect(`/kubernetes${history.location.search}`).toBe(entry);
      expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    });

    it('falls back to the default query when the query in the URL is invalid KQL', () => {
      const { result } = renderUrlState(
        "/kubernetes?_a=(query:(language:kuery,query:'foo:'),dateRange:(from:now-1h,to:now))"
      );

      expect(result.current[0].query).toEqual(kuery(''));
      expect(result.current[0].dateRange).toEqual({ from: 'now-1h', to: 'now' });
    });

    it('accepts a Lucene query from the URL', () => {
      const { result } = renderUrlState(
        "/kubernetes?_a=(query:(language:lucene,query:'host.name:web'))"
      );

      expect(result.current[0].query).toEqual({ language: 'lucene', query: 'host.name:web' });
    });

    it('falls back to the default query when the language in the URL is unknown', () => {
      const { result } = renderUrlState('/kubernetes?_a=(query:(language:sql,query:foo))');

      expect(result.current[0].query).toEqual(kuery(''));
    });

    it('ignores a filter without meta and keeps the rest of the state', () => {
      const { result } = renderUrlState(
        '/kubernetes?_a=(filters:!((meta:(key:host.name)),(foo:bar)),dateRange:(from:now-1h,to:now))'
      );

      expect(result.current[0].filters).toEqual([{ meta: { key: 'host.name' } }]);
      expect(result.current[0].dateRange).toEqual({ from: 'now-1h', to: 'now' });
    });

    it('drops a filter that cannot be built and keeps the rest of the state', () => {
      const { result } = renderUrlState(
        '/kubernetes?_a=(filters:!((meta:(type:combined))),dateRange:(from:now-1h,to:now))'
      );

      expect(result.current[0].filters).toEqual([]);
      expect(result.current[0].dateRange).toEqual({ from: 'now-1h', to: 'now' });
    });

    it('uses the defaults for the parts missing from the URL state', () => {
      const { result } = renderUrlState(
        '/kubernetes?_a=(filterControls:(attributes:(os.type:!(linux))))'
      );
      const [state] = result.current;

      expect(state.filterControls).toEqual({ attributes: { 'os.type': ['linux'] } });
      expect(state.dateRange).toEqual(DEFAULT_TIME_RANGE);
      expect(state.query).toEqual(kuery(''));
      expect(state.filters).toEqual([]);
    });

    it('goes back to the defaults when the page changes to a URL without state', () => {
      const { result, history } = renderUrlState(
        '/kubernetes?_a=(filterControls:(attributes:(os.type:!(linux))))'
      );
      expect(result.current[0].filterControls).toEqual({ attributes: { 'os.type': ['linux'] } });

      act(() => {
        history.push('/hosts');
      });

      expect(result.current[0].filterControls).toEqual({ attributes: {} });
    });

    it('ignores the global _g state', () => {
      const { result } = renderUrlState('/kubernetes?_g=(time:(from:now-7d,to:now))');

      expect(result.current[0].dateRange).toEqual(DEFAULT_TIME_RANGE);
    });
  });
});
