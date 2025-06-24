/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMonitorLocations } from './utils';

describe('parseMonitorLocations', () => {
  const pvtLoc1 = {
    label: 'Test Private Location',
    id: 'test-private-location',
    isServiceManaged: false,
    geo: {
      lat: 0,
      lon: 0,
    },
  };

  const pvtLoc2 = {
    label: 'Test Private Location 2',
    id: 'test-private-location-2',
    isServiceManaged: false,
    geo: {
      lat: 0,
      lon: 0,
    },
  };

  const localLoc = {
    label: 'Local',
    id: 'local',
    isServiceManaged: true,
  };
  const localLoc2 = {
    label: 'Local 2',
    id: 'local2',
    isServiceManaged: true,
  };

  it('should return expected', function () {
    const result = parseMonitorLocations({
      locations: [pvtLoc1, pvtLoc2, localLoc],
      private_locations: [],
    } as any);
    expect(result).toEqual({
      locations: ['local'],
      privateLocations: ['test-private-location', 'test-private-location-2'],
    });
  });

  it('should return expected when private_locations key is there', function () {
    const result = parseMonitorLocations({
      locations: [pvtLoc1, pvtLoc2, localLoc],
      private_locations: ['pv1', 'pv2'],
    } as any);
    expect(result).toEqual({
      locations: ['local'],
      privateLocations: ['pv1', 'pv2', 'test-private-location', 'test-private-location-2'],
    });
  });

  it('should return expected when only labels are there', function () {
    const result = parseMonitorLocations({
      locations: ['local'],
      private_locations: ['pv1', 'pv2'],
    } as any);
    expect(result).toEqual({
      locations: ['local'],
      privateLocations: ['pv1', 'pv2'],
    });
  });

  it('should remove locations not specified anymore', function () {
    const result = parseMonitorLocations(
      {
        locations: [],
      } as any,
      [pvtLoc1, pvtLoc2, localLoc]
    );

    expect(result).toEqual({
      locations: [],
      privateLocations: ['test-private-location', 'test-private-location-2'],
    });
  });

  it('should handle editing location', function () {
    const result = parseMonitorLocations(
      {
        locations: ['local'],
      } as any,
      [localLoc, localLoc2]
    );

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: [],
    });
  });

  it('should add private locations to existing', function () {
    const result = parseMonitorLocations(
      {
        private_locations: ['test-private-location-2'],
      } as any,
      [pvtLoc1, localLoc]
    );

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: ['test-private-location-2'],
    });
  });

  it('should remove private locations not specified anymore', function () {
    const result = parseMonitorLocations(
      {
        private_locations: [],
      } as any,
      [pvtLoc1, pvtLoc2, localLoc]
    );

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: [],
    });
  });

  it('should handle both empty', function () {
    const result = parseMonitorLocations(
      {
        private_locations: [],
        locations: [],
      } as any,
      [pvtLoc1, pvtLoc2, localLoc]
    );

    expect(result).toEqual({
      locations: [],
      privateLocations: [],
    });
  });

  it('should handle both not provided', function () {
    const result = parseMonitorLocations({} as any, [pvtLoc1, pvtLoc2, localLoc]);

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: ['test-private-location', 'test-private-location-2'],
    });
  });

  it('should handle same locations', function () {
    const result = parseMonitorLocations(
      {
        locations: [localLoc],
      } as any,
      [localLoc]
    );

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: [],
    });
  });

  it('should handle same locations with id', function () {
    const result = parseMonitorLocations(
      {
        locations: [],
        private_locations: [pvtLoc1.id],
      } as any,
      [pvtLoc1]
    );

    expect(result).toEqual({
      locations: [],
      privateLocations: [pvtLoc1.id],
    });
  });

  it('should handle private location removed', function () {
    const result = parseMonitorLocations(
      {
        locations: [localLoc],
      } as any,
      [pvtLoc1],
      true
    );

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: [],
    });
  });

  it('should handle on empty payload', function () {
    const result = parseMonitorLocations({} as any, [localLoc], true);

    expect(result).toEqual({
      locations: ['local'],
      privateLocations: [],
    });
  });

  it('should handle private location objects', function () {
    const result = parseMonitorLocations(
      {
        locations: [pvtLoc1],
      } as any,
      [localLoc, pvtLoc1],
      true
    );

    expect(result).toEqual({
      locations: [],
      privateLocations: ['test-private-location'],
    });
  });
});
