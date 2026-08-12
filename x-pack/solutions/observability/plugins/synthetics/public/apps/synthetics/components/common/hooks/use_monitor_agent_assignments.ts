/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MonitorAgentAssignment } from '../../../../../../server/routes/settings/private_locations/get_monitor_agent_assignment';
import { getMonitorAgentAssignments } from '../../../state/private_locations/api';
import { useSyntheticsRefreshContext } from '../../../contexts';

/**
 * Which agent host each of a monitor's condition-sharded private locations pins
 * it to (empty for monitors on no scalable location). Refetches on app refresh.
 */
export const useMonitorAgentAssignments = (configId?: string) => {
  const [data, setData] = useState<MonitorAgentAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const { lastRefresh } = useSyntheticsRefreshContext();

  useEffect(() => {
    if (!configId) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMonitorAgentAssignments(configId)
      .then((assignments) => {
        if (!cancelled) {
          setData(assignments);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [configId, lastRefresh]);

  return { assignments: data, loading };
};
