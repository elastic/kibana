/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { renderHook } from '@testing-library/react';
import type { UseGraphPreviewParams } from './use_graph_preview';
import { useGraphPreview } from './use_graph_preview';
import type { GetFieldsData } from './use_get_fields_data';
import { mockFieldData } from '../mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_data_formatted_for_field_browser';
import { useHasGraphVisualizationLicense } from '../../../../common/hooks/use_has_graph_visualization_license';
import {
  GRAPH_ACTOR_EUID_SOURCE_FIELDS,
  GRAPH_TARGET_EUID_SOURCE_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';

jest.mock('../../../../common/hooks/use_has_graph_visualization_license');
const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;

jest.mock('../../../../entity_analytics/components/entity_store/hooks/use_entity_store');
import { useEntityStoreStatus } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_store';
const mockUseEntityStoreStatus = useEntityStoreStatus as jest.Mock;

// All EUID source fields (must explicitly handle to avoid mockFieldData bleed-through)
const ALL_EUID_SOURCE_FIELDS: readonly string[] = [
  ...GRAPH_ACTOR_EUID_SOURCE_FIELDS,
  ...GRAPH_TARGET_EUID_SOURCE_FIELDS,
];

// Mock uses EUID source fields (user.id as actor, entity.target.id as target)
// Explicitly returns undefined for all other EUID source fields to prevent mockFieldData bleed-through
const alertMockGetFieldsData: GetFieldsData = (field: string) => {
  if (field === 'kibana.alert.uuid') {
    return 'alertId';
  } else if (field === 'kibana.alert.original_event.id') {
    return 'eventId';
  } else if (field === 'user.id') {
    return 'userActorId';
  } else if (field === 'entity.target.id') {
    return 'entityTargetId';
  } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
    // Explicitly return undefined for all other EUID source fields
    return undefined;
  }

  return mockFieldData[field];
};

const alertMockDataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

// Mock uses EUID source fields (user.id as actor, entity.target.id as target)
// Explicitly returns undefined for all other EUID source fields to prevent mockFieldData bleed-through
const eventMockGetFieldsData: GetFieldsData = (field: string) => {
  if (field === 'kibana.alert.uuid') {
    return;
  } else if (field === 'kibana.alert.original_event.id') {
    return;
  } else if (field === 'event.id') {
    return 'eventId';
  } else if (field === 'user.id') {
    return 'userActorId';
  } else if (field === 'entity.target.id') {
    return 'entityTargetId';
  } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
    return undefined;
  }

  return mockFieldData[field];
};

const eventMockDataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [];

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: graph visualization feature is available
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    // Default mock: entity store is running
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  });

  it(`should return false when missing actor and target`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      // Return undefined for all EUID source fields (actor and target)
      if (
        field === 'user.email' ||
        field === 'user.id' ||
        field === 'user.name' ||
        field === 'host.id' ||
        field === 'host.name' ||
        field === 'host.hostname' ||
        field === 'service.name' ||
        field === 'entity.id' ||
        field === 'user.target.email' ||
        field === 'user.target.id' ||
        field === 'user.target.name' ||
        field === 'host.target.id' ||
        field === 'host.target.name' ||
        field === 'host.target.hostname' ||
        field === 'service.target.name' ||
        field === 'entity.target.id'
      ) {
        return;
      }
      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
      initialProps: {
        getFieldsData: alertMockGetFieldsData,
        ecsData: {
          _id: 'id',
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      // Return undefined for all actor EUID source fields
      if (
        field === 'user.email' ||
        field === 'user.id' ||
        field === 'user.name' ||
        field === 'host.id' ||
        field === 'host.name' ||
        field === 'host.hostname' ||
        field === 'service.name' ||
        field === 'entity.id'
      ) {
        return;
      }
      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      // Return undefined for all target EUID source fields
      if (
        field === 'user.target.email' ||
        field === 'user.target.id' ||
        field === 'user.target.name' ||
        field === 'host.target.id' ||
        field === 'host.target.name' ||
        field === 'host.target.hostname' ||
        field === 'service.target.name' ||
        field === 'entity.target.id'
      ) {
        return;
      }
      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.original_event.id') {
        return;
      }

      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === '@timestamp') {
        return;
      }

      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

  it(`should return true when event has graph graph preview`, () => {
    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData: eventMockGetFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: eventMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return;
      } else if (field === 'kibana.alert.original_event.id') {
        return;
      } else if (field === 'event.id') {
        return ['id1', 'id2'];
      } else if (field === 'user.id') {
        return ['userActorId1', 'userActorId2'];
      } else if (field === 'entity.target.id') {
        return ['entityTargetId1', 'entityTargetId2'];
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action1', 'action2'],
          },
        },
        dataFormattedForFieldBrowser: eventMockDataFormattedForFieldBrowser,
      },
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
    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData: alertMockGetFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return ['id1', 'id2'];
      } else if (field === 'user.id') {
        return ['userActorId1', 'userActorId2'];
      } else if (field === 'entity.target.id') {
        return ['entityTargetId1', 'entityTargetId2'];
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action1', 'action2'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

  it(`should return true when alert has graph preview with user EUID source fields (user.name)`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'user.name') {
        return 'userActorId';
      } else if (field === 'service.target.name') {
        return 'serviceTargetId';
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

  it(`should return true when alert has graph preview with host EUID source fields (host.id)`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'host.id') {
        return 'hostActorId';
      } else if (field === 'entity.target.id') {
        return 'entityTargetId';
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

  it(`should return true when alert has graph preview with service EUID source fields (service.name)`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'service.name') {
        return 'serviceActorId';
      } else if (field === 'user.target.id') {
        return 'userTargetId';
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

  it(`should return true when alert has graph preview with generic EUID source fields (entity.id)`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'entity.id') {
        return 'entityActorId';
      } else if (field === 'host.target.id') {
        return 'hostTargetId';
      } else if (ALL_EUID_SOURCE_FIELDS.includes(field)) {
        return undefined;
      }

      return mockFieldData[field];
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData: alertMockGetFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
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

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData: alertMockGetFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
    });

    expect(hookResult.result.current.shouldShowGraph).toBe(false);
  });
});
