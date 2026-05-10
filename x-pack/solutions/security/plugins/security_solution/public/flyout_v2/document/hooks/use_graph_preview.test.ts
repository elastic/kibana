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

jest.mock('../../../common/hooks/use_has_graph_visualization_license');
jest.mock('../../../entity_analytics/components/entity_store/hooks/use_entity_store');

const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;
const mockUseEntityStoreStatus = useEntityStoreStatus as jest.Mock;

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
  'user.entity.id': 'userActorId',
  'entity.target.id': 'entityTargetId',
};

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  });

  it('returns hasGraphData=false for an empty hit', () => {
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit({}) }));

    expect(result.current.hasGraphData).toBe(false);
    expect(result.current.shouldShowGraph).toBe(false);
    expect(result.current.eventIds).toEqual([]);
    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.timestamp).toBeNull();
  });

  it('derives all graph parameters from a populated alert document', () => {
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(baseAlert) }));

    expect(result.current.timestamp).toBe('2025-01-01T00:00:00.000Z');
    expect(result.current.eventIds).toEqual(['original-event-id']);
    expect(result.current.actorIds).toEqual(['userActorId']);
    expect(result.current.targetIds).toEqual(['entityTargetId']);
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
          'user.entity.id': 'userActorId',
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

  it('returns action=undefined and hasGraphData=false when event.action is missing', () => {
    const { 'event.action': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.action).toBeUndefined();
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when actor is missing (target exists)', () => {
    const { 'user.entity.id': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.actorIds).toEqual([]);
    expect(result.current.targetIds).toEqual(['entityTargetId']);
    expect(result.current.hasGraphData).toBe(false);
  });

  it('returns hasGraphData=false when target is missing (actor exists)', () => {
    const { 'entity.target.id': _omit, ...rest } = baseAlert;
    const { result } = renderHook(() => useGraphPreview({ hit: createMockHit(rest) }));

    expect(result.current.actorIds).toEqual(['userActorId']);
    expect(result.current.targetIds).toEqual([]);
    expect(result.current.hasGraphData).toBe(false);
  });

  it.each([
    ['user.entity.id', 'user.target.entity.id'],
    ['host.entity.id', 'host.target.entity.id'],
    ['service.entity.id', 'service.target.entity.id'],
    ['entity.id', 'entity.target.id'],
  ])('resolves actor=%s and target=%s', (actorField, targetField) => {
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

    expect(result.current.actorIds).toEqual(['actor-id']);
    expect(result.current.targetIds).toEqual(['target-id']);
    expect(result.current.hasGraphData).toBe(true);
  });

  it('aggregates multiple actor/target values across fields', () => {
    const { result } = renderHook(() =>
      useGraphPreview({
        hit: createMockHit({
          '@timestamp': '2025-01-01T00:00:00.000Z',
          'kibana.alert.original_event.id': ['id1', 'id2'],
          'event.action': ['action1', 'action2'],
          'event.kind': 'signal',
          'user.entity.id': ['userActorId1', 'userActorId2'],
          'entity.target.id': ['entityTargetId1', 'entityTargetId2'],
        }),
      })
    );

    expect(result.current.eventIds).toEqual(['id1', 'id2']);
    expect(result.current.actorIds).toEqual(['userActorId1', 'userActorId2']);
    expect(result.current.targetIds).toEqual(['entityTargetId1', 'entityTargetId2']);
    expect(result.current.action).toEqual(['action1', 'action2']);
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
