/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allLocationsToClientContract, updatePrivateLocationMonitors } from './helpers';
import { RouteContext } from '../../types';

// Mock the syncEditedMonitorBulk module
jest.mock('../../monitor_cruds/bulk_cruds/edit_monitor_bulk', () => ({
  syncEditedMonitorBulk: jest.fn().mockResolvedValue({
    failedConfigs: [],
    errors: [],
    editedMonitors: [],
  }),
}));

// Import the mocked function
import { syncEditedMonitorBulk } from '../../monitor_cruds/bulk_cruds/edit_monitor_bulk';

const testLocations = {
  locations: [
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: 0, lon: 0 },
      isInvalid: false,
      isServiceManaged: false,
      tags: ['a tag 2'],
    },
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: '', lon: '' },
      isInvalid: true,
      isServiceManaged: true,
      tags: ['a tag'],
    },
  ],
};

const testLocations2 = {
  locations: [
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: -10, lon: 20 },
      isInvalid: false,
      isServiceManaged: false,
      tags: ['a tag 2'],
    },
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: -10, lon: 20 },
      isInvalid: true,
      isServiceManaged: true,
      tags: ['a tag'],
    },
  ],
};

describe('toClientContract', () => {
  it('formats SO attributes to client contract with falsy geo location', () => {
    // @ts-ignore fixtures are purposely wrong types for testing
    expect(allLocationsToClientContract(testLocations)).toEqual([
      {
        agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
        geo: {
          lat: 0,
          lon: 0,
        },
        id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        isInvalid: true,
        isServiceManaged: false,
        label: 'BEEP',
        tags: ['a tag 2'],
      },
      {
        agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        geo: {
          lat: '',
          lon: '',
        },
        id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        isInvalid: true,
        isServiceManaged: false,
        label: 'BEEP',
        tags: ['a tag'],
      },
    ]);
  });

  it('formats SO attributes to client contract with truthy geo location', () => {
    // @ts-ignore fixtures are purposely wrong types for testing
    expect(allLocationsToClientContract(testLocations2)).toEqual([
      {
        agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
        geo: {
          lat: -10,
          lon: 20,
        },
        id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        isInvalid: true,
        isServiceManaged: false,
        label: 'BEEP',
        tags: ['a tag 2'],
      },
      {
        agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        geo: {
          lat: -10,
          lon: 20,
        },
        id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
        isInvalid: true,
        isServiceManaged: false,
        label: 'BEEP',
        tags: ['a tag'],
      },
    ]);
  });
});

describe('updatePrivateLocationMonitors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const LOCATION_ID = 'test-location-id';
  const NEW_LABEL = 'New location label';
  const FIRST_SPACE_ID = 'firstSpaceId';
  const SECOND_SPACE_ID = 'secondSpaceId';
  const FIRST_MONITOR_ID = 'monitor-1';
  const SECOND_MONITOR_ID = 'monitor-2';
  const mockMonitors = [
    {
      id: FIRST_MONITOR_ID,
      attributes: {
        name: 'Test Monitor 1',
        locations: [{ id: LOCATION_ID, label: 'Old Label' }],
        // Other required monitor fields
        type: 'http',
        enabled: true,
        schedule: { number: '10', unit: 'm' },
        namespace: FIRST_SPACE_ID,
      },
      namespaces: [FIRST_SPACE_ID],
    },
    {
      id: SECOND_MONITOR_ID,
      attributes: {
        name: 'Test Monitor 2',
        locations: [
          { id: LOCATION_ID, label: 'Old Label' },
          { id: 'different-location', label: 'Different Location' },
        ],
        // Other required monitor fields
        type: 'http',
        enabled: true,
        schedule: { number: '5', unit: 'm' },
        namespace: SECOND_SPACE_ID,
      },
      namespaces: [SECOND_SPACE_ID],
    },
  ];

  it('updates monitor locations with the new label', async () => {
    const PRIVATE_LOCATIONS = [] as any[];
    const ROUTE_CONTEXT = {} as RouteContext;
    // Call the function
    await updatePrivateLocationMonitors({
      locationId: LOCATION_ID,
      newLocationLabel: NEW_LABEL,
      allPrivateLocations: PRIVATE_LOCATIONS,
      routeContext: ROUTE_CONTEXT,
      monitorsInLocation: mockMonitors as any,
    });

    // Verify that syncEditedMonitorBulk was called
    expect(syncEditedMonitorBulk).toHaveBeenCalledTimes(2);

    // Check first call for first space
    expect(syncEditedMonitorBulk).toHaveBeenCalledWith({
      monitorsToUpdate: expect.arrayContaining([
        expect.objectContaining({
          decryptedPreviousMonitor: mockMonitors[0],
          normalizedMonitor: expect.any(Object),
          monitorWithRevision: expect.objectContaining({
            locations: [
              expect.objectContaining({
                id: LOCATION_ID,
                label: NEW_LABEL,
              }),
            ],
          }),
        }),
      ]),
      privateLocations: PRIVATE_LOCATIONS,
      routeContext: ROUTE_CONTEXT,
      spaceId: FIRST_SPACE_ID,
    });

    // Check second call for second space
    expect(syncEditedMonitorBulk).toHaveBeenCalledWith({
      monitorsToUpdate: expect.arrayContaining([
        expect.objectContaining({
          decryptedPreviousMonitor: mockMonitors[1],
          normalizedMonitor: expect.any(Object),
          monitorWithRevision: expect.objectContaining({
            locations: [
              expect.objectContaining({
                id: LOCATION_ID,
                label: NEW_LABEL,
              }),
              expect.objectContaining({
                id: 'different-location',
                label: 'Different Location',
              }),
            ],
          }),
        }),
      ]),
      privateLocations: PRIVATE_LOCATIONS,
      routeContext: ROUTE_CONTEXT,
      spaceId: SECOND_SPACE_ID,
    });
  });
});
