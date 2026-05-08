/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useShouldShowGraph } from '../../../flyout/shared/hooks/use_should_show_graph';
import { useGraphPreviewData } from './use_graph_preview_data';

jest.mock('@kbn/entity-store/public');
jest.mock('../../../flyout/shared/hooks/use_should_show_graph');

const mockEuidApi = {
  euid: {
    getEuidSourceFields: (entityType: string) => {
      if (entityType === 'user') {
        return { identitySourceFields: ['user.name'] };
      }
      if (entityType === 'host') {
        return { identitySourceFields: ['host.name'] };
      }
      if (entityType === 'service') {
        return { identitySourceFields: ['service.name'] };
      }
      return { identitySourceFields: [] };
    },
  },
};

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('useGraphPreviewData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useEntityStoreEuidApi).mockReturnValue(mockEuidApi as never);
    jest.mocked(useShouldShowGraph).mockReturnValue(true);
  });

  it('returns hasGraphData=false for an empty hit', () => {
    const { result } = renderHook(() => useGraphPreviewData(createMockHit({})));

    expect(result.current.hasGraphData).toBe(false);
    expect(result.current.shouldShowGraph).toBe(false);
    expect(result.current.eventIds).toEqual([]);
    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.timestamp).toBeNull();
  });

  it('derives all graph parameters from a populated alert document', () => {
    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'kibana.alert.original_event.id': 'original-event-id',
      'event.id': 'event-id',
      'event.action': ['process-started'],
      'event.kind': 'signal',
      'user.name': 'alice',
      'host.name': 'host-1',
      'user.target.name': 'bob',
      'host.target.name': 'host-2',
    });

    const { result } = renderHook(() => useGraphPreviewData(hit));

    expect(result.current.timestamp).toBe('2025-01-01T00:00:00.000Z');
    expect(result.current.eventIds).toEqual(['original-event-id']);
    expect(result.current.actorIds).toEqual(expect.arrayContaining(['alice', 'host-1']));
    expect(result.current.targetIds).toEqual(expect.arrayContaining(['bob', 'host-2']));
    expect(result.current.action).toEqual(['process-started']);
    expect(result.current.isAlert).toBe(true);
    expect(result.current.hasGraphData).toBe(true);
    expect(result.current.shouldShowGraph).toBe(true);
  });

  it('falls back to event.id when kibana.alert.original_event.id is absent', () => {
    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'event.id': 'event-id',
      'event.action': ['action'],
      'event.kind': 'event',
      'user.name': 'alice',
      'user.target.name': 'bob',
    });

    const { result } = renderHook(() => useGraphPreviewData(hit));

    expect(result.current.eventIds).toEqual(['event-id']);
    expect(result.current.isAlert).toBe(false);
  });

  it('returns shouldShowGraph=false when license/entity store gate fails', () => {
    jest.mocked(useShouldShowGraph).mockReturnValue(false);

    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'event.id': 'event-id',
      'event.action': ['action'],
      'user.name': 'alice',
      'user.target.name': 'bob',
    });

    const { result } = renderHook(() => useGraphPreviewData(hit));

    expect(result.current.hasGraphData).toBe(true);
    expect(result.current.shouldShowGraph).toBe(false);
  });

  it('falls back to empty source fields when the EUID api is unavailable', () => {
    jest.mocked(useEntityStoreEuidApi).mockReturnValue(undefined as never);

    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'event.id': 'event-id',
      'event.action': ['action'],
      'event.kind': 'signal',
      'user.name': 'alice',
    });

    const { result } = renderHook(() => useGraphPreviewData(hit));

    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.hasGraphData).toBe(false);
  });
});
