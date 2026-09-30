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
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useResolvedDocument } from './use_resolved_document';

jest.mock('@kbn/unified-doc-viewer-plugin/public');
jest.mock('../../../../timelines/containers/details', () => ({
  useTimelineEventsDetails: jest.fn(() => [false, null, undefined, null, jest.fn()]),
}));

const dataView = { getRuntimeMappings: () => ({}) } as unknown as DataView;

const createHit = (id: string, index: string): DataTableRecord =>
  ({
    id,
    raw: { _id: id, _index: index },
    flattened: {},
    isAnchor: false,
  } as DataTableRecord);

const renderResolvedDocument = (params: Partial<Parameters<typeof useResolvedDocument>[0]> = {}) =>
  renderHook(() =>
    useResolvedDocument({
      documentId: 'doc-id',
      indexName: 'my-index',
      dataView,
      skip: false,
      ...params,
    })
  );

describe('useResolvedDocument', () => {
  const refetchPinned = jest.fn();
  const refetchIndexName = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Loading,
      null,
      refetchPinned,
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      null,
      undefined,
      null,
      refetchIndexName,
    ]);
  });

  it('is loading while the pinned search is in flight', () => {
    const { result } = renderResolvedDocument();

    expect(result.current).toEqual({ status: 'loading', hit: null, refetch: expect.any(Function) });
  });

  it('is loading while the pinned search still holds the previous document', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      createHit('doc-id', 'my-index'),
      refetchPinned,
    ]);

    const { result, rerender } = renderResolvedDocument();

    expect(result.current.status).toBe('found');

    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      createHit('doc-id', 'my-index'),
      refetchPinned,
    ]);
    rerender();

    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      createHit('other-id', 'other-index'),
      refetchPinned,
    ]);
    rerender();

    expect(result.current).toEqual({ status: 'loading', hit: null, refetch: expect.any(Function) });
  });

  it('returns the pinned hit when its id and index match', () => {
    const hit = createHit('doc-id', 'my-index');
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, hit, refetchPinned]);

    const { result } = renderResolvedDocument();

    expect(result.current).toEqual({ status: 'found', hit, refetch: expect.any(Function) });
    expect(useTimelineEventsDetails).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('returns a backing-index hit when the pinned search misses a data stream or alias', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.NotFound,
      null,
      refetchPinned,
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      null,
      {
        _id: 'doc-id',
        _index: '.ds-logs-gcp.audit-default-000001',
        _source: { event: { kind: 'event' } },
      },
      null,
      refetchIndexName,
    ]);

    const { result } = renderResolvedDocument({ indexName: 'logs-gcp.audit-default' });

    expect(result.current.status).toBe('found');
    expect(result.current.hit?.raw._index).toBe('.ds-logs-gcp.audit-default-000001');
    expect(useTimelineEventsDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'logs-gcp.audit-default',
        eventId: 'doc-id',
        skip: false,
      })
    );
  });

  it('stays loading until the direct index-name search has been started', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.NotFound,
      null,
      refetchPinned,
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      true,
      null,
      undefined,
      null,
      refetchIndexName,
    ]);

    const { result } = renderResolvedDocument({ indexName: 'logs-gcp.audit-default' });

    expect(result.current.status).toBe('loading');
  });

  it('is not found when both searches miss', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.NotFound,
      null,
      refetchPinned,
    ]);

    const { result } = renderResolvedDocument();

    expect(result.current).toEqual({
      status: 'notFound',
      hit: null,
      refetch: expect.any(Function),
    });
  });

  it('is an error when the pinned search fails', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Error, null, refetchPinned]);

    const { result } = renderResolvedDocument();

    expect(result.current.status).toBe('error');
    expect(useTimelineEventsDetails).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('refetches both searches', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      createHit('doc-id', 'my-index'),
      refetchPinned,
    ]);

    const { result } = renderResolvedDocument();

    result.current.refetch();

    expect(refetchPinned).toHaveBeenCalledTimes(1);
    expect(refetchIndexName).toHaveBeenCalledTimes(1);
  });
});
