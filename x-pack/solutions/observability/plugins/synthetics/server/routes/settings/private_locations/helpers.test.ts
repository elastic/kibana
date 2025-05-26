/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { allLocationsToClientContract, updatePrivateLocationMonitors } from './helpers';

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
  const mockMonitors = [
    {
      id: 'monitor-1',
      attributes: {
        name: 'Test Monitor 1',
        locations: [{ id: 'other-location', label: 'Other Location' }],
        // Other required monitor fields
        type: 'http',
        enabled: true,
        schedule: { number: '10', unit: 'm' },
      },
    },
    {
      id: 'monitor-2',
      attributes: {
        name: 'Test Monitor 2',
        locations: [
          { id: 'different-location', label: 'Different Location' },
          { id: LOCATION_ID, label: 'Old Label' },
        ],
        // Other required monitor fields
        type: 'http',
        enabled: true,
        schedule: { number: '5', unit: 'm' },
      },
    },
  ];

  it('updates monitor locations with the new label', async () => {
    // Mock the monitorConfigRepository
    const mockMonitorConfigRepository = {
      findDecryptedMonitors: jest.fn().mockResolvedValue(mockMonitors),
      bulkUpdate: jest.fn().mockResolvedValue({}),
    };

    // Call the function
    await updatePrivateLocationMonitors({
      locationId: LOCATION_ID,
      newLocationLabel: NEW_LABEL,
      monitorConfigRepository: mockMonitorConfigRepository as any,
    });

    // Verify findDecryptedMonitors was called correctly
    expect(mockMonitorConfigRepository.findDecryptedMonitors).toHaveBeenCalledWith({
      spaceId: ALL_SPACES_ID,
      filter: `synthetics-monitor.attributes.locations.id:("${LOCATION_ID}")`,
    });

    // Verify bulkUpdate was called with the updated monitors
    expect(mockMonitorConfigRepository.bulkUpdate).toHaveBeenCalledWith({
      monitors: [
        mockMonitors[0],
        {
          ...mockMonitors[1],
          attributes: {
            ...mockMonitors[1].attributes,
            locations: [
              mockMonitors[1].attributes.locations[0],
              { ...mockMonitors[1].attributes.locations[1], label: NEW_LABEL },
            ],
          },
        },
      ],
    });
  });
});
