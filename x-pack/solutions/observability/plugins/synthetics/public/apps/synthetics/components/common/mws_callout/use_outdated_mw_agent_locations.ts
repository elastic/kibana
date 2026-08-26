/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAgentStats } from '../../settings/private_locations/hooks/use_agent_stats';
import { isAgentVersionMwCompatible } from '../../../../../../common/utils/agent_mw_support';

/**
 * Private location ids with at least one enrolled agent whose version
 * predates Maintenance Window support, so monitors assigned a maintenance
 * window there may keep running through it.
 */
export const useOutdatedMwAgentLocationIds = () => {
  const { byLocation } = useAgentStats();

  const outdatedLocationIds = useMemo(() => {
    const ids = new Set<string>();
    byLocation.forEach((stats, locationId) => {
      if (stats.agents.some((agent) => !isAgentVersionMwCompatible(agent.agentVersion))) {
        ids.add(locationId);
      }
    });
    return ids;
  }, [byLocation]);

  return { outdatedLocationIds };
};
