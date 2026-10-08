/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { act, renderHook } from '@testing-library/react';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  MAX_EXPANDED_ENTITY_IDS,
  useEntityAnalyticsUrlState,
} from './use_entity_analytics_url_state';

const renderUrlState = (search = '') => {
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [`/entities${search}`] });
  const wrapper = ({ children }: PropsWithChildren) => (
    <Router history={history}>{children}</Router>
  );
  const { result } = renderHook(() => useEntityAnalyticsUrlState(), { wrapper });
  const params = () => Object.fromEntries(new URLSearchParams(history.location.search));
  return { result, history, params };
};

describe('useEntityAnalyticsUrlState', () => {
  it('reads defaults from an empty URL and leaves the URL as is', () => {
    const { result, history } = renderUrlState();

    expect(result.current).toEqual(
      expect.objectContaining({
        timeRange: '30d',
        rowsMode: 'resolved',
        sortField: 'entity.risk.calculated_score_norm',
        sortDirection: 'desc',
        pageIndex: 0,
        pageSize: 10,
        expandedIds: [],
        activeTile: null,
        entityFilters: {
          entityTypes: [],
          riskLevels: [],
          assetCriticality: [],
          watchlists: [],
          dataSources: [],
        },
      })
    );
    expect(history.location.search).toBe('');
    expect(history.length).toBe(1);
  });

  it('reads valid params', () => {
    const { result } = renderUrlState(
      '?eaTimeRange=7d&eaRowsMode=individual&eaSortField=alert_count&eaSortDir=asc&eaPage=3&eaPageSize=25&eaActiveTile=riskMovers&entityTypes=host,user&riskLevels=Critical'
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        timeRange: '7d',
        rowsMode: 'individual',
        sortField: 'alert_count',
        sortDirection: 'asc',
        pageIndex: 3,
        pageSize: 25,
        activeTile: 'riskMovers',
        entityFilters: expect.objectContaining({
          entityTypes: ['host', 'user'],
          riskLevels: ['Critical'],
        }),
      })
    );
  });

  it('reads invalid params as defaults without rewriting the URL', () => {
    const search =
      '?eaTimeRange=1y&eaRowsMode=x&eaSortField=nope&eaSortDir=asc&eaPage=-1&eaPageSize=7&eaActiveTile=nope&entityTypes=host,bogus';
    const { result, history } = renderUrlState(search);

    expect(result.current).toEqual(
      expect.objectContaining({
        timeRange: '30d',
        rowsMode: 'resolved',
        sortField: 'entity.risk.calculated_score_norm',
        // The direction of an invalid sort field reads as the default too.
        sortDirection: 'desc',
        pageIndex: 0,
        pageSize: 10,
        activeTile: null,
        entityFilters: expect.objectContaining({ entityTypes: ['host'] }),
      })
    );
    expect(history.location.search).toBe(search);
  });

  it('reads the Records sort of individual rows as the default sort', () => {
    const { result } = renderUrlState(
      '?eaRowsMode=individual&eaSortField=group_size&eaSortDir=asc'
    );

    expect(result.current.sortField).toBe('entity.risk.calculated_score_norm');
    expect(result.current.sortDirection).toBe('desc');
  });

  it('pushes a sort change and goes back to the first page', () => {
    const { result, history, params } = renderUrlState('?eaPage=2');

    act(() => result.current.setSort('anomaly_count', 'asc'));

    expect(params()).toEqual({ eaSortField: 'anomaly_count', eaSortDir: 'asc' });
    expect(result.current.sortField).toBe('anomaly_count');
    expect(history.length).toBe(2);
  });

  it('does not push a change that leaves the URL the same', () => {
    const { result, history } = renderUrlState('?eaTimeRange=7d');

    act(() => result.current.setTimeRange('7d'));

    expect(history.length).toBe(1);
  });

  it('switches to individual rows without the Records sort, the page or expanded rows', () => {
    const { result, params } = renderUrlState(
      '?eaSortField=group_size&eaSortDir=asc&eaPage=2&eaExpanded=host%3Aa'
    );

    act(() => result.current.setRowsMode('individual'));

    expect(params()).toEqual({
      eaRowsMode: 'individual',
      eaSortField: 'entity.risk.calculated_score_norm',
      eaSortDir: 'desc',
    });
  });

  it('writes entity filters and drops empty ones', () => {
    const { result, params } = renderUrlState('?watchlists=w1&eaPage=4');

    act(() =>
      result.current.setEntityFilters({
        entityTypes: [EntityType.host],
        riskLevels: [],
        assetCriticality: ['high_impact'],
        watchlists: [],
        dataSources: [],
      })
    );

    expect(params()).toEqual({ entityTypes: 'host', assetCriticality: 'high_impact' });
  });

  it('clears the filters, the tile and the sort on reset', () => {
    const { result, params } = renderUrlState(
      '?entityTypes=host&eaActiveTile=riskMovers&eaSortField=alert_count&eaSortDir=asc&eaPage=2&eaTimeRange=7d'
    );

    act(() => result.current.resetGridQuery());

    expect(params()).toEqual({
      eaTimeRange: '7d',
      eaSortField: 'entity.risk.calculated_score_norm',
      eaSortDir: 'desc',
    });
  });

  it('resets the page without a new history entry', () => {
    const { result, history, params } = renderUrlState('?eaPage=2');

    act(() => result.current.resetPage());

    expect(params()).toEqual({});
    expect(history.length).toBe(1);
  });

  it('toggles expanded ids that contain commas, without new history entries', () => {
    const { result, history } = renderUrlState();

    act(() => result.current.toggleExpandedId('user:a,b@corp'));
    act(() => result.current.toggleExpandedId('host:h-1'));
    expect(result.current.expandedIds).toEqual(['user:a,b@corp', 'host:h-1']);

    act(() => result.current.toggleExpandedId('user:a,b@corp'));
    expect(result.current.expandedIds).toEqual(['host:h-1']);
    expect(history.length).toBe(1);
  });

  it('keeps the most recently expanded ids up to the cap', () => {
    const { result } = renderUrlState();
    const ids = Array.from({ length: MAX_EXPANDED_ENTITY_IDS + 2 }, (_, i) => `host:${i}`);

    for (const id of ids) act(() => result.current.toggleExpandedId(id));

    expect(result.current.expandedIds).toEqual(ids.slice(-MAX_EXPANDED_ENTITY_IDS));
  });
});
