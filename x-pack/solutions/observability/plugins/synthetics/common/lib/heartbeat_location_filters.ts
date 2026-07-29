/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  HEARTBEAT_UNMAPPED_LOCATION_ID,
  HEARTBEAT_UNMAPPED_LOCATION_LABEL,
} from '../runtime_types/heartbeat_monitor';

/**
 * Whether a location id or label refers to the synthetic placeholder assigned to
 * Heartbeat / Agent autodiscovery pings that carry no location. Both the id
 * (`observer.name`) and the label (`observer.geo.name`) placeholder are
 * recognized because callers filter on whichever one they hold.
 */
export const isUnmappedHeartbeatLocation = (location?: string): boolean =>
  location === HEARTBEAT_UNMAPPED_LOCATION_ID || location === HEARTBEAT_UNMAPPED_LOCATION_LABEL;

/**
 * Build the filter clause(s) for a single location field, transparently handling
 * the placeholder location. Autodiscovery pings have no `observer.name` /
 * `observer.geo.name`, so the overview surfaces them under a placeholder; a
 * plain `term` on that placeholder matches zero pings. For the placeholder we
 * match docs that are *missing* the field — exactly the location-less pings —
 * instead. Returns an array so callers can spread it into a `bool.filter`.
 */
export const getHeartbeatLocationFilter = ({
  field,
  value,
}: {
  field: 'observer.name' | 'observer.geo.name';
  value?: string;
}): QueryDslQueryContainer[] => {
  if (!value) {
    return [];
  }
  if (isUnmappedHeartbeatLocation(value)) {
    return [{ bool: { must_not: { exists: { field } } } }];
  }
  return [{ term: { [field]: value } }];
};

/**
 * Build the `observer.geo.name` `post_filter` for a set of selected location
 * labels, transparently handling the placeholder. Real labels stay a `terms`
 * filter; the placeholder becomes a `must_not exists` so location-less
 * autodiscovery pings are included. Returns `undefined` when no locations are
 * selected so callers can omit the `post_filter` entirely.
 */
export const getHeartbeatLocationsPostFilter = (
  locations: string[]
): QueryDslQueryContainer | undefined => {
  if (!locations.length) {
    return undefined;
  }

  const realLocations = locations.filter((location) => !isUnmappedHeartbeatLocation(location));
  const hasPlaceholder = locations.some(isUnmappedHeartbeatLocation);

  const should: QueryDslQueryContainer[] = [];
  if (realLocations.length) {
    should.push({ terms: { 'observer.geo.name': realLocations } });
  }
  if (hasPlaceholder) {
    should.push({ bool: { must_not: { exists: { field: 'observer.geo.name' } } } });
  }

  return should.length === 1 ? should[0] : { bool: { should, minimum_should_match: 1 } };
};
