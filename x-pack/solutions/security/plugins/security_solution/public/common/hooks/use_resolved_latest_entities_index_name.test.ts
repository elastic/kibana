/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../lib/kibana';
import { useResolvedLatestEntitiesIndexName } from './use_resolved_latest_entities_index_name';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../lib/kibana', () => ({ useKibana: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

const NEUTRAL_INDEX = '.entities.v2.latest.default-00001';
const LEGACY_INDEX = '.entities.v2.latest.security_default-00001';
const COLLIDING_SPACE_ALIAS = 'entities-latest-security_default';

describe('useResolvedLatestEntitiesIndexName', () => {
  const mockSearch = jest.fn();

  const shardsResponse = (total: number) => of({ rawResponse: { _shards: { total } } });

  const getQueryFn = () => {
    renderHook(() => useResolvedLatestEntitiesIndexName('default'));
    const [options] = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
    return options.queryFn as () => Promise<{ indexName: string | null }>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    mockUseQuery.mockReturnValue({ data: undefined });
  });

  it('returns the neutral concrete name when it has shards', async () => {
    mockSearch.mockReturnValue(shardsResponse(1));

    await expect(getQueryFn()()).resolves.toEqual({ indexName: NEUTRAL_INDEX });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ index: NEUTRAL_INDEX }) })
    );
  });

  it('falls back to the legacy Security-scoped name on un-migrated deployments', async () => {
    mockSearch.mockImplementation(({ params }: { params: { index: string } }) =>
      shardsResponse(params.index === LEGACY_INDEX ? 1 : 0)
    );

    await expect(getQueryFn()()).resolves.toEqual({ indexName: LEGACY_INDEX });
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ index: COLLIDING_SPACE_ALIAS }),
      })
    );
  });

  it('skips the legacy fallback when space security_{ns} owns the colliding names', async () => {
    // Space "security_default" is migrated: its neutral index IS this space's
    // legacy name, and its entities-latest-security_default alias is live.
    mockSearch.mockImplementation(({ params }: { params: { index: string } }) =>
      shardsResponse(params.index === NEUTRAL_INDEX ? 0 : 1)
    );

    await expect(getQueryFn()()).resolves.toEqual({ indexName: null });
    expect(mockSearch).not.toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ index: LEGACY_INDEX }) })
    );
  });

  it('returns null when neither naming scheme has a live index', async () => {
    mockSearch.mockReturnValue(shardsResponse(0));

    await expect(getQueryFn()()).resolves.toEqual({ indexName: null });
  });

  it('treats 403/security_exception errors as the index being unavailable', async () => {
    mockSearch.mockReturnValue(
      throwError(() => Object.assign(new Error('security_exception'), { statusCode: 403 }))
    );

    await expect(getQueryFn()()).resolves.toEqual({ indexName: null });
  });

  it('rethrows transient errors instead of caching a wrong answer', async () => {
    mockSearch.mockReturnValue(
      throwError(() => Object.assign(new Error('Internal Server Error'), { statusCode: 500 }))
    );

    await expect(getQueryFn()()).rejects.toThrow('Internal Server Error');
  });

  it('does not run until the space id is known', () => {
    renderHook(() => useResolvedLatestEntitiesIndexName(undefined));
    const [options] = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
    expect(options.enabled).toBe(false);
  });
});
