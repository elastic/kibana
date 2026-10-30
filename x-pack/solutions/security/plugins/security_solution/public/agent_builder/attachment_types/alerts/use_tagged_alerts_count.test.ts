/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of, NEVER, throwError } from 'rxjs';
import { useTaggedAlertsCount } from './use_tagged_alerts_count';

const searchReturning = (total: number | { value: number; relation: string }) =>
  jest.fn(() => of({ rawResponse: { hits: { total, hits: [] } } }));

const noIds: string[] = [];
const proposalTags = ['az:proposal:p1'];

describe('useTaggedAlertsCount', () => {
  it('reads how many alerts carry the tags', async () => {
    const search = searchReturning({ value: 42, relation: 'eq' });

    const { result } = renderHook(() =>
      useTaggedAlertsCount({
        alertIds: noIds,
        tags: proposalTags,
        spaceId: 'default',
        search: search as never,
      })
    );

    await waitFor(() => expect(result.current).toBe(42));
  });

  it('counts the ids and the tags of the selection over the link time range', async () => {
    const search = searchReturning(3);
    const alertIds = ['a'];

    const { result } = renderHook(() =>
      useTaggedAlertsCount({
        alertIds,
        tags: proposalTags,
        createdAt: '2026-10-20T00:00:00.000Z',
        spaceId: 'default',
        search: search as never,
      })
    );

    await waitFor(() => expect(result.current).toBe(3));
    expect(search).toHaveBeenCalledWith({
      params: {
        index: '.alerts-security.alerts-default',
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    { ids: { values: ['a'] } },
                    { terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                range: {
                  '@timestamp': { gte: '2026-09-22T00:00:00.000Z', lte: expect.any(String) },
                },
              },
            ],
          },
        },
      },
    });
  });

  it('does not search when the selection has no tags', () => {
    const search = searchReturning(1);
    const alertIds = ['a', 'b'];

    const { result } = renderHook(() =>
      useTaggedAlertsCount({ alertIds, tags: noIds, spaceId: 'default', search: search as never })
    );

    expect(result.current).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('does not search until the space is known', () => {
    const search = searchReturning(1);

    const { result } = renderHook(() =>
      useTaggedAlertsCount({ alertIds: noIds, tags: proposalTags, search: search as never })
    );

    expect(result.current).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('warns and stays undefined when the search fails', async () => {
    const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
    const search = jest.fn(() => throwError(() => new Error('search failed')));

    const { result } = renderHook(() =>
      useTaggedAlertsCount({
        alertIds: noIds,
        tags: proposalTags,
        spaceId: 'default',
        search: search as never,
      })
    );

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    warn.mockRestore();
  });

  it('does not show the previous count while the next selection loads', async () => {
    const search = jest
      .fn()
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: 5, hits: [] } } }))
      .mockReturnValueOnce(NEVER);

    const { result, rerender } = renderHook(
      ({ tags }) =>
        useTaggedAlertsCount({
          alertIds: noIds,
          tags,
          spaceId: 'default',
          search: search as never,
        }),
      { initialProps: { tags: proposalTags } }
    );
    await waitFor(() => expect(result.current).toBe(5));

    rerender({ tags: ['az:proposal:p2'] });

    expect(result.current).toBeUndefined();
  });
});
