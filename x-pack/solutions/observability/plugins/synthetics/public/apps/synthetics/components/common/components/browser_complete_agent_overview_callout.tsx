/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useAgentStats } from '../../settings/private_locations/hooks/use_agent_stats';
import { useLocationMonitors } from '../../settings/private_locations/hooks/use_location_monitors';
import {
  BrowserCompleteAgentCallout,
  locationLabelsWithoutCompleteAgent,
} from './browser_complete_agent_callout';

/** Overview banner for private locations whose browser monitors cannot run. */
export const BrowserCompleteAgentOverviewCallout = () => {
  const { byLocation, loading: statsLoading } = useAgentStats();
  const { locationMonitors, loading: monitorsLoading } = useLocationMonitors();
  const locationLabels = locationLabelsWithoutCompleteAgent(
    [...byLocation.values()],
    locationMonitors,
    Boolean(statsLoading || monitorsLoading)
  );

  return <BrowserCompleteAgentCallout locationLabels={locationLabels} scope="locations" />;
};
