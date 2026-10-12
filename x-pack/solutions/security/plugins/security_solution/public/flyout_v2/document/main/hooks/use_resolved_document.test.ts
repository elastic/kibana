/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useResolvedDocument } from './use_resolved_document';

jest.mock('@kbn/unified-doc-viewer-plugin/public');

const dataView = {} as unknown as DataView;
const refetch = jest.fn();

const hit = {
  id: 'doc-id',
  raw: { _id: 'doc-id', _index: '.ds-backing-index' },
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

const renderResolvedDocument = (skip = false) =>
  renderHook(() =>
    useResolvedDocument({ documentId: 'doc-id', indexName: 'my-alias', dataView, skip })
  );

const mockSearch = (state: ElasticRequestState, result: DataTableRecord | null = null) =>
  (useEsDocSearch as jest.Mock).mockReturnValue([state, result, refetch]);

describe('useResolvedDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is loading while the search is in flight', () => {
    mockSearch(ElasticRequestState.Loading);

    expect(renderResolvedDocument().result.current).toEqual({
      status: 'loading',
      hit: null,
      refetch,
    });
  });

  it('is loading while the search is skipped', () => {
    mockSearch(ElasticRequestState.Found);

    expect(renderResolvedDocument(true).result.current.status).toBe('loading');
  });

  it('is loading when the search reports found before a hit has arrived', () => {
    mockSearch(ElasticRequestState.Found);

    expect(renderResolvedDocument().result.current.status).toBe('loading');
  });

  it('returns the hit even when its _index is the backing index of the requested alias', () => {
    mockSearch(ElasticRequestState.Found, hit);

    expect(renderResolvedDocument().result.current).toEqual({ status: 'found', hit, refetch });
  });

  it('is not found when the search finds nothing', () => {
    mockSearch(ElasticRequestState.NotFound);

    expect(renderResolvedDocument().result.current.status).toBe('notFound');
  });

  it.each([ElasticRequestState.Error, ElasticRequestState.NotFoundDataView])(
    'is an error for %s',
    (state) => {
      mockSearch(state);

      expect(renderResolvedDocument().result.current.status).toBe('error');
    }
  );
});
