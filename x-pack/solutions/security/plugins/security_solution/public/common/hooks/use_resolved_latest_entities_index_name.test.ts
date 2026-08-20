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
  });

  it('returns null when neither naming scheme has a live index', async () => {
    mockSearch.mockReturnValue(shardsResponse(0));

    await expect(getQueryFn()()).resolves.toEqual({ indexName: null });
  });

  it('treats search errors (e.g. 403) as the index being unavailable', async () => {
    mockSearch.mockReturnValue(throwError(() => new Error('security_exception')));

    await expect(getQueryFn()()).resolves.toEqual({ indexName: null });
  });

  it('does not run until the space id is known', () => {
    renderHook(() => useResolvedLatestEntitiesIndexName(undefined));
    const [options] = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
    expect(options.enabled).toBe(false);
  });
});
