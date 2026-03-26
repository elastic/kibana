/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { UseGraphPreviewParams } from './use_graph_preview';
import { useGraphPreview } from './use_graph_preview';
import { mockFieldData } from '../../../flyout/document_details/shared/mocks/mock_get_fields_data';
import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';

jest.mock('../../../common/hooks/use_has_graph_visualization_license');
const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;

jest.mock('../../../entity_analytics/components/entity_store/hooks/use_entity_store');
const mockUseEntityStoreStatus = useEntityStoreStatus as jest.Mock;

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertMockFlattened: DataTableRecord['flattened'] = {
  ...mockFieldData,
  'kibana.alert.uuid': 'alertId',
  'kibana.alert.rule.uuid': 'ruleUuid',
  'kibana.alert.original_event.id': 'eventId',
  'user.entity.id': 'userActorId',
  'entity.target.id': 'entityTargetId',
};

const eventMockFlattened: DataTableRecord['flattened'] = {
  ...mockFieldData,
  'event.id': 'eventId',
  'user.entity.id': 'userActorId',
  'entity.target.id': 'entityTargetId',
};

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: graph visualization feature is available
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    // Default mock: entity store is running
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  });

  it(`should return false when missing actor and target`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.entity.id': undefined,
      'host.entity.id': undefined,
      'service.entity.id': undefined,
      'entity.id': undefined,
      'user.target.entity.id': undefined,
      'host.target.entity.id': undefined,
      'service.target.entity.id': undefined,
      'entity.target.id': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: [],
      action: ['action'],
      targetIds: [],
      isAlert: true,
    });
  });

  it(`should return false when missing event.action`, () => {
    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit({ ...alertMockFlattened }) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: undefined,
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return false when missing actor (target exists)`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.entity.id': undefined,
      'host.entity.id': undefined,
      'service.entity.id': undefined,
      'entity.id': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: [],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return false when missing target (actor exists)`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.target.entity.id': undefined,
      'host.target.entity.id': undefined,
      'service.target.entity.id': undefined,
      'entity.target.id': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: [],
      isAlert: true,
    });
  });

  it(`should return false when missing original_event.id`, () => {
    const flattened = {
      ...alertMockFlattened,
      'kibana.alert.original_event.id': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: [],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return false when timestamp is missing`, () => {
    const flattened = {
      ...alertMockFlattened,
      '@timestamp': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: false,
      timestamp: null,
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when event has graph preview`, () => {
    const flattened = {
      ...eventMockFlattened,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: false,
    });
  });

  it(`should return true when event has graph preview with multiple values`, () => {
    const flattened = {
      ...mockFieldData,
      'event.id': ['id1', 'id2'],
      'user.entity.id': ['userActorId1', 'userActorId2'],
      'entity.target.id': ['entityTargetId1', 'entityTargetId2'],
      'event.action': ['action1', 'action2'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['id1', 'id2'],
      actorIds: ['userActorId1', 'userActorId2'],
      action: ['action1', 'action2'],
      targetIds: ['entityTargetId1', 'entityTargetId2'],
      isAlert: false,
    });
  });

  it(`should return true when alert has graph preview`, () => {
    const flattened = {
      ...alertMockFlattened,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with multiple values`, () => {
    const flattened = {
      ...alertMockFlattened,
      'kibana.alert.original_event.id': ['id1', 'id2'],
      'user.entity.id': ['userActorId1', 'userActorId2'],
      'entity.target.id': ['entityTargetId1', 'entityTargetId2'],
      'event.action': ['action1', 'action2'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['id1', 'id2'],
      actorIds: ['userActorId1', 'userActorId2'],
      action: ['action1', 'action2'],
      targetIds: ['entityTargetId1', 'entityTargetId2'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema user.entity.id`, () => {
    const flattened = {
      ...alertMockFlattened,
      'service.target.entity.id': 'serviceTargetId',
      'entity.target.id': undefined,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['serviceTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema host.entity.id`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.entity.id': undefined,
      'host.entity.id': 'hostActorId',
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['hostActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema service.entity.id`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.entity.id': undefined,
      'service.entity.id': 'serviceActorId',
      'entity.target.id': undefined,
      'user.target.entity.id': 'userTargetId',
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['serviceActorId'],
      action: ['action'],
      targetIds: ['userTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema entity.id`, () => {
    const flattened = {
      ...alertMockFlattened,
      'user.entity.id': undefined,
      'entity.id': 'entityActorId',
      'entity.target.id': undefined,
      'host.target.entity.id': 'hostTargetId',
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: true,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['entityActorId'],
      action: ['action'],
      targetIds: ['hostTargetId'],
      isAlert: true,
    });
  });

  it('should return false when all conditions are met but env does not have required license', () => {
    mockUseHasGraphVisualizationLicense.mockReturnValue(false);

    const flattened = {
      ...alertMockFlattened,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current.shouldShowGraph).toBe(false);
    expect(hookResult.result.current).toStrictEqual({
      shouldShowGraph: false,
      hasGraphData: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it('should return false for shouldShowGraph when entity store is not running', () => {
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'not_installed' } });

    const flattened = {
      ...alertMockFlattened,
      'event.action': ['action'],
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: { hit: createMockHit(flattened) },
    });

    expect(hookResult.result.current.shouldShowGraph).toBe(false);
  });
});
