/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useShouldShowGraph } from '../../graph/hooks/use_should_show_graph';
import { useGraphPreview } from './use_graph_preview';

jest.mock('@kbn/entity-store/public');
jest.mock('../../graph/hooks/use_should_show_graph');

const mockEuidApi = {
  euid: {
    getEuidSourceFields: (entityType: string) => {
      const fieldsMap: Record<string, string[]> = {
        user: ['user.name'],
        host: ['host.name'],
        service: ['service.name'],
        generic: ['entity.id'],
      };
      return { identitySourceFields: fieldsMap[entityType] ?? [] };
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

const baseAlertFlattened = {
  '@timestamp': '2025-01-01T00:00:00.000Z',
  'kibana.alert.original_event.id': 'original-event-id',
  'event.action': ['action'],
  'event.kind': 'signal',
  'user.name': 'alice',
  'user.target.name': 'bob',
};

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useEntityStoreEuidApi).mockReturnValue(mockEuidApi as never);
    jest.mocked(useShouldShowGraph).mockReturnValue(true);
  });

  it('returns hasGraphData=false for an empty hit', () => {
    const { result } = renderHook(() => useGraphPreview(createMockHit({})));

    expect(result.current.hasGraphData).toBe(false);
    expect(result.current.shouldShowGraph).toBe(false);
    expect(result.current.eventIds).toEqual([]);
    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.timestamp).toBeNull();
  });

  it('derives all graph parameters from a populated alert document', () => {
    const hit = createMockHit({
      ...baseAlertFlattened,
      'event.id': 'event-id',
      'host.name': 'host-1',
      'host.target.name': 'host-2',
    });

    const { result } = renderHook(() => useGraphPreview(hit));

    expect(result.current.timestamp).toBe('2025-01-01T00:00:00.000Z');
    expect(result.current.eventIds).toEqual(['original-event-id']);
    expect(result.current.actorIds).toEqual(expect.arrayContaining(['alice', 'host-1']));
    expect(result.current.targetIds).toEqual(expect.arrayContaining(['bob', 'host-2']));
    expect(result.current.action).toEqual(['action']);
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

    const { result } = renderHook(() => useGraphPreview(hit));

    expect(result.current.eventIds).toEqual(['event-id']);
    expect(result.current.isAlert).toBe(false);
  });

  it('returns eventIds=[] when neither original_event.id nor event.id exist', () => {
    const { 'kibana.alert.original_event.id': _omit, ...rest } = baseAlertFlattened;
    const { result } = renderHook(() => useGraphPreview(createMockHit(rest)));

    expect(result.current.eventIds).toEqual([]);
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when timestamp is missing', () => {
    const { '@timestamp': _omit, ...rest } = baseAlertFlattened;
    const { result } = renderHook(() => useGraphPreview(createMockHit(rest)));

    expect(result.current.timestamp).toBeNull();
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns action=undefined and hasGraphData=false when event.action is missing', () => {
    const { 'event.action': _omit, ...rest } = baseAlertFlattened;
    const { result } = renderHook(() => useGraphPreview(createMockHit(rest)));

    expect(result.current.action).toBeUndefined();
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when actor is missing (target exists)', () => {
    const { 'user.name': _omit, ...rest } = baseAlertFlattened;
    const { result } = renderHook(() => useGraphPreview(createMockHit(rest)));

    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual(['bob']);
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when target is missing (actor exists)', () => {
    const { 'user.target.name': _omit, ...rest } = baseAlertFlattened;
    const { result } = renderHook(() => useGraphPreview(createMockHit(rest)));

    expect(result.current.actorIds).toEqual(['alice']);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.hasGraphData).toBe(false);
  });

  it('aggregates actor/target across multiple EUID source fields', () => {
    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'kibana.alert.original_event.id': 'original-event-id',
      'event.action': ['action'],
      'event.kind': 'signal',
      'user.name': 'alice',
      'host.name': 'host-1',
      'user.target.name': 'bob',
      'host.target.name': 'host-2',
    });

    const { result } = renderHook(() => useGraphPreview(hit));

    expect(result.current.actorIds).toEqual(expect.arrayContaining(['alice', 'host-1']));
    expect(result.current.actorIds).toHaveLength(2);
    expect(result.current.targetIds).toEqual(expect.arrayContaining(['bob', 'host-2']));
    expect(result.current.targetIds).toHaveLength(2);
    expect(result.current.hasGraphData).toBe(true);
  });

  it.each([
    ['user', 'user.name', 'user.target.name'],
    ['host', 'host.name', 'host.target.name'],
    ['service', 'service.name', 'service.target.name'],
    ['generic', 'entity.id', 'entity.target.id'],
  ])('resolves %s EUID source fields for actor and target', (_label, actorField, targetField) => {
    const hit = createMockHit({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'kibana.alert.original_event.id': 'original-event-id',
      'event.action': ['action'],
      'event.kind': 'signal',
      [actorField]: 'actor-id',
      [targetField]: 'target-id',
    });

    const { result } = renderHook(() => useGraphPreview(hit));

    expect(result.current.actorIds).toEqual(['actor-id']);
    expect(result.current.targetIds).toEqual(['target-id']);
    expect(result.current.hasGraphData).toBe(true);
  });

  it('returns shouldShowGraph=false when license/entity store gate fails', () => {
    jest.mocked(useShouldShowGraph).mockReturnValue(false);

    const hit = createMockHit({
      ...baseAlertFlattened,
      'event.id': 'event-id',
    });

    const { result } = renderHook(() => useGraphPreview(hit));

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

    const { result } = renderHook(() => useGraphPreview(hit));

    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.hasGraphData).toBe(false);
  });
});
