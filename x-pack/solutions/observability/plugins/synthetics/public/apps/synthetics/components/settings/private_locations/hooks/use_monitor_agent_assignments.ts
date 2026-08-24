/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MonitorLocationAssignment } from '../../../../../../../common/types';
import { fetchMonitorAgentAssignments } from '../../../../state/agent_stats/api';
import { useSyntheticsRefreshContext } from '../../../../contexts';

/**
 * Per-location agents that run a monitor. Slim assignment payload — not the
 * full agent_stats capacity row.
 */
export const useMonitorAgentAssignments = (monitorId?: string) => {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const [assignments, setAssignments] = useState<MonitorLocationAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!monitorId) {
      setAssignments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchMonitorAgentAssignments(monitorId)
      .then((result) => {
        if (!cancelled) {
          setAssignments(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignments([]);
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
  }, [monitorId, lastRefresh]);

  return { assignments, loading };
};
