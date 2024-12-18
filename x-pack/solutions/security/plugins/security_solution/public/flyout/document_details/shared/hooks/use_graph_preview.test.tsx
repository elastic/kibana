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

const alertMockGetFieldsData: GetFieldsData = (field: string) => {
  if (field === 'kibana.alert.uuid') {
    return 'alertId';
  } else if (field === 'kibana.alert.original_event.id') {
    return 'eventId';
  } else if (field === 'actor.entity.id') {
    return 'actorId';
  } else if (field === 'target.entity.id') {
    return 'targetId';
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
  } else if (field === 'actor.entity.id') {
    return 'actorId';
  } else if (field === 'target.entity.id') {
    return 'targetId';
  }

  return mockFieldData[field];
};

const eventMockDataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [];

describe('useGraphPreview', () => {
  it(`should return false when missing actor`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'actor.entity.id') {
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
      hasGraphRepresentation: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: [],
      action: ['action'],
      targetIds: ['targetId'],
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
      hasGraphRepresentation: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['actorId'],
      action: undefined,
      targetIds: ['targetId'],
      isAlert: true,
    });
  });

  it(`should return false when missing target`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'target.entity.id') {
        return;
      }
      return alertMockGetFieldsData(field);
    };

    const hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
        },
        dataFormattedForFieldBrowser: alertMockDataFormattedForFieldBrowser,
      },
    });

    expect(hookResult.result.current).toStrictEqual({
      hasGraphRepresentation: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['actorId'],
      action: undefined,
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
      hasGraphRepresentation: false,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: [],
      actorIds: ['actorId'],
      action: ['action'],
      targetIds: ['targetId'],
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
      hasGraphRepresentation: false,
      timestamp: null,
      eventIds: ['eventId'],
      actorIds: ['actorId'],
      action: ['action'],
      targetIds: ['targetId'],
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
      hasGraphRepresentation: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['actorId'],
      action: ['action'],
      targetIds: ['targetId'],
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
      } else if (field === 'actor.entity.id') {
        return ['actorId1', 'actorId2'];
      } else if (field === 'target.entity.id') {
        return ['targetId1', 'targetId2'];
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
      hasGraphRepresentation: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['id1', 'id2'],
      actorIds: ['actorId1', 'actorId2'],
      action: ['action1', 'action2'],
      targetIds: ['targetId1', 'targetId2'],
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
      hasGraphRepresentation: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['eventId'],
      actorIds: ['actorId'],
      action: ['action'],
      targetIds: ['targetId'],
      isAlert: true,
    });
  });

  it(`should return true when alert has graph preview with multiple values`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.uuid') {
        return 'alertId';
      } else if (field === 'kibana.alert.original_event.id') {
        return ['id1', 'id2'];
      } else if (field === 'actor.entity.id') {
        return ['actorId1', 'actorId2'];
      } else if (field === 'target.entity.id') {
        return ['targetId1', 'targetId2'];
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
      hasGraphRepresentation: true,
      timestamp: mockFieldData['@timestamp'][0],
      eventIds: ['id1', 'id2'],
      actorIds: ['actorId1', 'actorId2'],
      action: ['action1', 'action2'],
      targetIds: ['targetId1', 'targetId2'],
      isAlert: true,
    });
  });
});
