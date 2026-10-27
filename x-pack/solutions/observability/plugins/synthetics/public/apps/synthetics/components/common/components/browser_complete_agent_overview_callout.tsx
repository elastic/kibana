/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocationMonitors } from '../../settings/private_locations/hooks/use_location_monitors';
import { BrowserCompleteAgentCallout } from './browser_complete_agent_callout';
import { useMissingCompleteAgentLocations } from './use_missing_complete_agent_locations';

/** Overview banner for private locations whose browser monitors cannot run. */
export const BrowserCompleteAgentOverviewCallout = () => {
  const { locations } = useMissingCompleteAgentLocations();
  const { locationMonitors, loading } = useLocationMonitors();

  const locationLabels = useMemo(() => {
    if (!locations || loading) {
      return [];
    }
    const browserLocationIds = new Set(
      locationMonitors.filter(({ browserCount }) => browserCount > 0).map(({ id }) => id)
    );
    return locations.filter(({ id }) => browserLocationIds.has(id)).map(({ label }) => label);
  }, [locations, locationMonitors, loading]);

  return <BrowserCompleteAgentCallout locationLabels={locationLabels} scope="locations" />;
};
