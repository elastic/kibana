/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { GAP_AUTO_FILL_STATUS } from '@kbn/alerting-plugin/common';
import { invariant } from '../../../../common/utils/invariant';
import {
  useGetGapAutoFillScheduler,
  useFindGapAutoFillSchedulerLogs,
} from '../api/hooks/use_gap_auto_fill_scheduler';
import { useGapAutoFillCapabilities } from '../logic/use_gap_auto_fill_capabilities';
import type { GapAutoFillSchedulerResponse } from '../types';

interface GapAutoFillSchedulerContextValue {
  canAccessGapAutoFill: boolean;
  canEditGapAutoFill: boolean;
  hasEnterpriseLicense: boolean;

  scheduler: GapAutoFillSchedulerResponse | undefined;
  isSchedulerLoading: boolean;
  isSchedulerFetching: boolean;

  hasErrors: boolean;
  latestErrorTimestamp: string | undefined;
  totalErrors: number;
}

const GapAutoFillSchedulerContext = createContext<GapAutoFillSchedulerContextValue | null>(null);

export const GapAutoFillSchedulerProvider = ({ children }: { children: React.ReactNode }) => {
  const { canAccessGapAutoFill, canEditGapAutoFill, hasEnterpriseLicense } =
    useGapAutoFillCapabilities();

  // Fetch scheduler data
  const {
    data: scheduler,
    isLoading: isSchedulerLoading,
    isFetching: isSchedulerFetching,
  } = useGetGapAutoFillScheduler({
    enabled: canAccessGapAutoFill,
  });

  // Fetch error logs - only if scheduler is enabled
  // We only need to know if there are ANY errors, so perPage: 1 is sufficient
  const STALE_TIME = 10 * 60 * 1000; // 10 minutes - data considered fresh, then refetch on next access
  const { data: errorLogsData } = useFindGapAutoFillSchedulerLogs({
    page: 1,
    perPage: 1,
    statuses: [GAP_AUTO_FILL_STATUS.ERROR],
    sortField: '@timestamp',
    sortDirection: 'desc',
    enabled: canAccessGapAutoFill && scheduler?.enabled === true,
    staleTime: STALE_TIME,
  });

  const value = useMemo(() => {
    const latestErrorTimestamp = errorLogsData?.data?.[0]?.timestamp;
    const totalErrors = errorLogsData?.total ?? 0;
    const hasErrors = totalErrors > 0;

    return {
      canAccessGapAutoFill,
      canEditGapAutoFill,
      hasEnterpriseLicense,

      scheduler,
      isSchedulerLoading,
      isSchedulerFetching,

      hasErrors,
      latestErrorTimestamp,
      totalErrors,
    };
  }, [
    canAccessGapAutoFill,
    canEditGapAutoFill,
    hasEnterpriseLicense,
    scheduler,
    isSchedulerLoading,
    isSchedulerFetching,
    errorLogsData,
  ]);

  return (
    <GapAutoFillSchedulerContext.Provider value={value}>
      {children}
    </GapAutoFillSchedulerContext.Provider>
  );
};

export const useGapAutoFillSchedulerContext = (): GapAutoFillSchedulerContextValue => {
  const context = useContext(GapAutoFillSchedulerContext);
  invariant(
    context,
    'useGapAutoFillSchedulerContext must be used within a GapAutoFillSchedulerProvider'
  );
  return context;
};
