/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { getProjectRoutingFromJobSummary } from '@kbn/ml-cps-common';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import type { JobSummary } from './api/ml_get_jobs_summary_api';

/**
 * Resolves the CPS project scope an ML job's datafeed searches with, so queries for its
 * raw log data can be scoped like the job itself instead of following the project picker.
 * Returns undefined when no scope applies, leaving the queries at their default scope.
 */
export const useLogAnalysisJobProjectRouting = (
  jobSummary?: JobSummary
): ProjectRouting | undefined => {
  const { services } = useKibanaContextForPlugin();
  const isCpsEnabled = Boolean(services.cps?.isTierEligible && services.cps?.cpsManager);

  const { projectRouting, isUiamEnabled } = jobSummary ?? {};

  return useMemo(() => {
    if (!isCpsEnabled) {
      return undefined;
    }

    return getProjectRoutingFromJobSummary({ projectRouting, isUiamEnabled }) ?? undefined;
  }, [isCpsEnabled, projectRouting, isUiamEnabled]);
};
