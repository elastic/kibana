/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { isUnmappedHeartbeatLocation } from '../../../../../../../common/lib/heartbeat_location_filters';

const OBSERVER_GEO_NAME = 'observer.geo.name';

/**
 * Build the ExploratoryView location scoping for a flyout series, transparently
 * handling the Heartbeat placeholder. Location-less autodiscovery pings have no
 * `observer.geo.name`, so the overview groups them under a placeholder; a plain
 * `observer.geo.name: <placeholder>` filter matches nothing. For the placeholder
 * we instead match docs that are *missing* the field (`notExists`) and drop the
 * `observer.geo.name` report definition so it isn't ANDed as a zero-match phrase.
 */
export const getLocationSeriesConfig = (
  location: string
): { reportDefinition: Record<string, string[]>; filters: UrlFilter[] } => {
  if (isUnmappedHeartbeatLocation(location)) {
    return {
      reportDefinition: {},
      filters: [{ field: OBSERVER_GEO_NAME, notExists: true }],
    };
  }
  return {
    reportDefinition: { [OBSERVER_GEO_NAME]: [location] },
    filters: [{ field: OBSERVER_GEO_NAME, values: [location] }],
  };
};
