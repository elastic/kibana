/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useGraphPreview } from './use_graph_preview';
import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';

jest.mock('../../../common/hooks/use_has_graph_visualization_license');
jest.mock('../../../entity_analytics/components/entity_store/hooks/use_entity_store');
jest.mock('@kbn/entity-store/public', () => {
  const actual = jest.requireActual('@kbn/entity-store/public');
  return {
    ...actual,
    useEntityStoreEuidApi: jest.fn(),
  };
});

const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;
const mockUseEntityStoreStatus = useEntityStoreStatus as jest.Mock;
const mockUseEntityStoreEuidApi = useEntityStoreEuidApi as jest.Mock;

// Minimal stand-in for the euid module's `getEntityIdentifiersFromDocument`: returns a
// non-null object when any of the per-type source fields is present on the flattened doc.
const IDENTITY_FIELDS_BY_TYPE: Record<string, string[]> = {
  user: ['user.id', 'user.name', 'user.email'],
  host: ['host.id', 'host.name', 'host.hostname'],
  service: ['service.name'],
  generic: ['entity.id'],
};
const mockEuid = {
  getEntityIdentifiersFromDocument: (
    entityType: string,
    doc: Record<string, unknown>
  ): Record<string, unknown> | undefined => {
    const fields = IDENTITY_FIELDS_BY_TYPE[entityType] ?? [];
    const matches: Record<string, unknown> = {};
    for (const field of fields) {
      if (doc[field] != null) matches[field] = doc[field];
    }
    return Object.keys(matches).length > 0 ? matches : undefined;
  },
};

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const baseAlert = {
  '@timestamp': '2025-01-01T00:00:00.000Z',
  'kibana.alert.original_event.id': 'original-event-id',
  'event.action': ['action'],
  'event.kind': 'signal',
  'user.id': 'userActorId',
  'entity.target.id': 'entityTargetId',
};

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: mockEuid });
  });

  it('returns hasGraphData=false for an empty hit', () => {
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit({}) }));

    expect(result.current.hasGraphData).toBe(false);
    expect(result.current.shouldShowGraph).toBe(false);
    expect(result.current.eventIds).toEqual([]);
    expect(result.current.timestamp).toBeNull();
  });

  it('derives all graph parameters from a populated alert document', () => {
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(baseAlert) }));

    expect(result.current.timestamp).toBe('2025-01-01T00:00:00.000Z');
    expect(result.current.eventIds).toEqual(['original-event-id']);
    expect(result.current.action).toEqual(['action']);
    expect(result.current.isAlert).toBe(true);
    expect(result.current.hasGraphData).toBe(true);
    expect(result.current.shouldShowGraph).toBe(true);
  });

  it('falls back to event.id when kibana.alert.original_event.id is absent', () => {
    const { result } = renderHook(() =>
      useGraphPreview({
        hit: createMockHit({
          '@timestamp': '2025-01-01T00:00:00.000Z',
          'event.id': 'event-id',
          'event.action': ['action'],
          'event.kind': 'event',
          'user.id': 'userActorId',
          'entity.target.id': 'entityTargetId',
        }),
      })
    );

    expect(result.current.eventIds).toEqual(['event-id']);
    expect(result.current.isAlert).toBe(false);
  });

  it('returns hasGraphData=false when timestamp is missing', () => {
    const { '@timestamp': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.timestamp).toBeNull();
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when event.action is missing', () => {
    const { 'event.action': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.action).toBeUndefined();
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when actor is missing (target exists)', () => {
    const { 'user.id': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when target is missing (actor exists)', () => {
    const { 'entity.target.id': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.hasGraphData).toBe(false);
  });

  it.each([
    ['user.id', 'user.target.entity.id'],
    ['host.name', 'host.target.entity.id'],
    ['service.name', 'service.target.entity.id'],
    ['entity.id', 'entity.target.id'],
  ])('detects actor=%s and target=%s', (actorField, targetField) => {
    const { result } = renderHook(() =>
      useGraphPreview({
        hit: createMockHit({
          '@timestamp': '2025-01-01T00:00:00.000Z',
          'kibana.alert.original_event.id': 'original-event-id',
          'event.action': ['action'],
          'event.kind': 'signal',
          [actorField]: 'actor-id',
          [targetField]: 'target-id',
        }),
      })
    );

    expect(result.current.hasGraphData).toBe(true);
  });

  it('still detects actor via v1 *.entity.id fields when euid is not yet hydrated', () => {
    mockUseEntityStoreEuidApi.mockReturnValue(null);

    const { result } = renderHook(() =>
      useGraphPreview({
        hit: createMockHit({
          '@timestamp': '2025-01-01T00:00:00.000Z',
          'kibana.alert.original_event.id': 'original-event-id',
          'event.action': ['action'],
          'event.kind': 'signal',
          'user.entity.id': 'userActorId',
          'entity.target.id': 'entityTargetId',
        }),
      })
    );

    expect(result.current.hasGraphData).toBe(true);
  });

  it('returns shouldShowGraph=false when license is missing', () => {
    mockUseHasGraphVisualizationLicense.mockReturnValue(false);

    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(baseAlert) }));

    expect(result.current.hasGraphData).toBe(true);
    expect(result.current.shouldShowGraph).toBe(false);
  });

  it('returns shouldShowGraph=false when entity store is not running', () => {
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'not_installed' } });

    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(baseAlert) }));

    expect(result.current.hasGraphData).toBe(true);
    expect(result.current.shouldShowGraph).toBe(false);
  });
});
