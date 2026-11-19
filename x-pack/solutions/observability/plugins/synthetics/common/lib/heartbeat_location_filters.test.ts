/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getHeartbeatLocationFilter,
  getHeartbeatLocationsPostFilter,
  isUnmappedHeartbeatLocation,
} from './heartbeat_location_filters';
import {
  HEARTBEAT_UNMAPPED_LOCATION_ID,
  HEARTBEAT_UNMAPPED_LOCATION_LABEL,
} from '../runtime_types/heartbeat_monitor';

describe('isUnmappedHeartbeatLocation', () => {
  it('recognizes the placeholder id and label', () => {
    expect(isUnmappedHeartbeatLocation(HEARTBEAT_UNMAPPED_LOCATION_ID)).toBe(true);
    expect(isUnmappedHeartbeatLocation(HEARTBEAT_UNMAPPED_LOCATION_LABEL)).toBe(true);
  });

  it('returns false for real locations and undefined', () => {
    expect(isUnmappedHeartbeatLocation('us-east')).toBe(false);
    expect(isUnmappedHeartbeatLocation(undefined)).toBe(false);
  });
});

describe('getHeartbeatLocationFilter', () => {
  it('returns an empty array when no value is provided', () => {
    expect(getHeartbeatLocationFilter({ field: 'observer.name', value: undefined })).toEqual([]);
  });

  it('builds a term filter for a real location', () => {
    expect(getHeartbeatLocationFilter({ field: 'observer.geo.name', value: 'US East' })).toEqual([
      { term: { 'observer.geo.name': 'US East' } },
    ]);
  });

  it('matches docs missing the field for the placeholder id', () => {
    expect(
      getHeartbeatLocationFilter({ field: 'observer.name', value: HEARTBEAT_UNMAPPED_LOCATION_ID })
    ).toEqual([{ bool: { must_not: { exists: { field: 'observer.name' } } } }]);
  });

  it('matches docs missing the field for the placeholder label', () => {
    expect(
      getHeartbeatLocationFilter({
        field: 'observer.geo.name',
        value: HEARTBEAT_UNMAPPED_LOCATION_LABEL,
      })
    ).toEqual([{ bool: { must_not: { exists: { field: 'observer.geo.name' } } } }]);
  });
});

describe('getHeartbeatLocationsPostFilter', () => {
  it('returns undefined when no locations are selected', () => {
    expect(getHeartbeatLocationsPostFilter([])).toBeUndefined();
  });

  it('builds a plain terms filter for real locations', () => {
    expect(getHeartbeatLocationsPostFilter(['US East', 'EU West'])).toEqual({
      terms: { 'observer.geo.name': ['US East', 'EU West'] },
    });
  });

  it('builds a must_not exists filter for the placeholder alone', () => {
    expect(getHeartbeatLocationsPostFilter([HEARTBEAT_UNMAPPED_LOCATION_LABEL])).toEqual({
      bool: { must_not: { exists: { field: 'observer.geo.name' } } },
    });
  });

  it('combines real locations and the placeholder with a should clause', () => {
    expect(getHeartbeatLocationsPostFilter(['US East', HEARTBEAT_UNMAPPED_LOCATION_LABEL])).toEqual(
      {
        bool: {
          minimum_should_match: 1,
          should: [
            { terms: { 'observer.geo.name': ['US East'] } },
            { bool: { must_not: { exists: { field: 'observer.geo.name' } } } },
          ],
        },
      }
    );
  });
});
