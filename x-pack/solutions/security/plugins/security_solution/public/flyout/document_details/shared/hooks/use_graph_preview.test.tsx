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

jest.mock('../../../../common/hooks/use_has_graph_visualization_license');
const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;

jest.mock('@kbn/kibana-react-plugin/public');
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
const mockUseUiSetting = useUiSetting$ as jest.Mock;

const alertMockGetFieldsData: GetFieldsData = (field: string) => {
  if (field === 'kibana.alert.uuid') {
    return 'alertId';
  } else if (field === 'kibana.alert.original_event.id') {
    return 'eventId';
  } else if (field === 'user.entity.id') {
    return 'userActorId';
  } else if (field === 'entity.target.id') {
    return 'entityTargetId';
  }

  return mockFieldData[field];
};

const alertMockDataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

const eventMockGetFieldsData: GetFieldsData = (field: string) => {
  if (field === 'kibana.alert.uuid') {
    return;
  } else if (field === 'kibana.alert.original_event.id') {
    return;
  } else if (field === 'event.id') {
    return 'eventId';
  } else if (field === 'user.entity.id') {
    return 'userActorId';
  } else if (field === 'entity.target.id') {
    return 'entityTargetId';
  }

  return mockFieldData[field];
};

const eventMockDataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [];

describe('useGraphPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: graph visualization feature is available
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    // Default mock: UI setting is enabled
    mockUseUiSetting.mockReturnValue([true, jest.fn()]);
  });

  it(`should return false when missing actor and target`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (
        field === 'user.entity.id' ||
        field === 'host.entity.id' ||
        field === 'service.entity.id' ||
        field === 'entity.id' ||
        field === 'user.target.entity.id' ||
        field === 'host.target.entity.id' ||
        field === 'service.target.entity.id' ||
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
      if (
        field === 'user.entity.id' ||
        field === 'host.entity.id' ||
        field === 'service.entity.id' ||
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
      if (
        field === 'user.target.entity.id' ||
        field === 'host.target.entity.id' ||
        field === 'service.target.entity.id' ||
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
      } else if (field === 'user.entity.id') {
        return ['userActorId1', 'userActorId2'];
      } else if (field === 'entity.target.id') {
        return ['entityTargetId1', 'entityTargetId2'];
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
      } else if (field === 'user.entity.id') {
        return ['userActorId1', 'userActorId2'];
      } else if (field === 'entity.target.id') {
        return ['entityTargetId1', 'entityTargetId2'];
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
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['id1', 'id2'],
      actorIds: ['userActorId1', 'userActorId2'],
      action: ['action1', 'action2'],
      targetIds: ['entityTargetId1', 'entityTargetId2'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema user.entity.id`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'user.entity.id') {
        return 'userActorId';
      } else if (field === 'service.target.entity.id') {
        return 'serviceTargetId';
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
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['serviceTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema host.entity.id`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'host.entity.id') {
        return 'hostActorId';
      } else if (field === 'entity.target.id') {
        return 'entityTargetId';
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
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['hostActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema service.entity.id`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'service.entity.id') {
        return 'serviceActorId';
      } else if (field === 'user.target.entity.id') {
        return 'userTargetId';
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
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['serviceActorId'],
      action: ['action'],
      targetIds: ['userTargetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with new ECS schema entity.id`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'entity.id') {
        return 'entityActorId';
      } else if (field === 'host.target.entity.id') {
        return 'hostTargetId';
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
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['userActorId'],
      action: ['action'],
      targetIds: ['entityTargetId'],
      isAlert: true,
    });
  });

  it('should return false for shouldShowGraph when UI setting is disabled', () => {
    mockUseUiSetting.mockReturnValue([false, jest.fn()]);

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
