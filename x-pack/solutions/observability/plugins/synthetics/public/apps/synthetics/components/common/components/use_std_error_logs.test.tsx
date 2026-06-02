/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as searchHooks from '@kbn/observability-shared-plugin/public/hooks/use_es_search';
import { useStdErrorLogs } from './use_std_error_logs';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

describe('useStdErrorLogs', () => {
  let searchHookSpy: jest.SpyInstance;

  beforeEach(() => {
    searchHookSpy = jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      loading: false,
      data: {
        hits: {
          total: { value: 0, relation: 'eq' },
          hits: [],
        },
      } as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queries ES with the correct parameters when checkGroup is provided', () => {
    renderHook(() => useStdErrorLogs({ checkGroup: 'test-check-group' }));

    expect(searchHookSpy).toHaveBeenCalledWith(
      {
        index: SYNTHETICS_INDEX_PATTERN,
        body: {
          size: 1000,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'synthetics.type': ['stderr', 'stdout'],
                  },
                },
                {
                  term: {
                    'monitor.check_group': 'test-check-group',
                  },
                },
              ],
            },
          },
        },
      },
      ['test-check-group'],
      { name: 'getStdErrLogs' }
    );
  });

  it('uses an empty index when checkGroup is not provided', () => {
    renderHook(() => useStdErrorLogs({}));

    expect(searchHookSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: '' }),
      [undefined],
      { name: 'getStdErrLogs' }
    );
  });

  it('returns formatted log items from ES hits', () => {
    searchHookSpy.mockReturnValue({
      loading: false,
      data: {
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            {
              _id: 'log-1',
              _source: { message: 'error occurred', 'synthetics.type': 'stderr' },
            },
            {
              _id: 'log-2',
              _source: { message: 'debug output', 'synthetics.type': 'stdout' },
            },
          ],
        },
      } as any,
    });

    const { result } = renderHook(() => useStdErrorLogs({ checkGroup: 'test-group' }));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]).toEqual(
      expect.objectContaining({ id: 'log-1', message: 'error occurred' })
    );
    expect(result.current.items[1]).toEqual(
      expect.objectContaining({ id: 'log-2', message: 'debug output' })
    );
    expect(result.current.loading).toBe(false);
  });

  it('returns empty items when data is undefined', () => {
    searchHookSpy.mockReturnValue({ loading: true, data: undefined });

    const { result } = renderHook(() => useStdErrorLogs({ checkGroup: 'test-group' }));

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('re-fetches when checkGroup changes', () => {
    const { rerender } = renderHook(({ checkGroup }) => useStdErrorLogs({ checkGroup }), {
      initialProps: { checkGroup: 'group-1' },
    });

    expect(searchHookSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { 'monitor.check_group': 'group-1' } }]),
            }),
          }),
        }),
      }),
      ['group-1'],
      { name: 'getStdErrLogs' }
    );

    rerender({ checkGroup: 'group-2' });

    expect(searchHookSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { 'monitor.check_group': 'group-2' } }]),
            }),
          }),
        }),
      }),
      ['group-2'],
      { name: 'getStdErrLogs' }
    );
  });
});
