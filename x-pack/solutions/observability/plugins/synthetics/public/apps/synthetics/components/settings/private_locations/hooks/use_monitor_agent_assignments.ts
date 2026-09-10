/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { MonitorLocationAssignment } from '../../../../../../../common/types';
import { fetchMonitorAgentAssignments } from '../../../../state/agent_stats/api';
import { useSyntheticsRefreshContext } from '../../../../contexts';

/**
 * Per-location agents that run a monitor. Slim assignment payload — not the
 * full agent_stats capacity row.
 */
export const useMonitorAgentAssignments = (
  monitorId?: string
): {
  assignments: MonitorLocationAssignment[];
  loading: boolean;
  error: boolean;
} => {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const [assignments, setAssignments] = useState<MonitorLocationAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(monitorId));
  const [error, setError] = useState(false);
  const loadedMonitorIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!monitorId) {
      loadedMonitorIdRef.current = undefined;
      setAssignments([]);
      setLoading(false);
      setError(false);
      return;
    }

    // Drop the previous monitor's rows immediately so a shared location id
    // cannot flash the wrong assigned agent while the next fetch is in flight.
    if (loadedMonitorIdRef.current !== monitorId) {
      setAssignments([]);
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchMonitorAgentAssignments(monitorId)
      .then((result) => {
        if (!cancelled) {
          loadedMonitorIdRef.current = monitorId;
          setAssignments(result);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
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

  return { assignments, loading, error };
};
