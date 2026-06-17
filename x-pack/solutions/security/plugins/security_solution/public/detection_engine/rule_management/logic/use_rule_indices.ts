/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getIndexListFromEsqlQuery } from '@kbn/securitysolution-utils';
import { useSecurityJobs } from '../../../common/components/ml_popover/hooks/use_security_jobs';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';

export const useRuleIndices = (
  machineLearningJobId?: string[],
  defaultRuleIndices?: string[],
  esqlQuery?: string
) => {
  const memoMlJobIds = useMemo(() => machineLearningJobId ?? [], [machineLearningJobId]);
  const { loading: mlSecurityJobLoading, jobs } = useSecurityJobs();
  const memoSelectedMlJobs = useMemo(
    () => jobs.filter(({ id }) => memoMlJobIds.includes(id)),
    [jobs, memoMlJobIds]
  );

  // Filter jobs that are installed. For those jobs we can get the index pattern from `job.results_index_name` field
  const memoInstalledMlJobs = useMemo(
    () => memoSelectedMlJobs.filter(({ isInstalled }) => isInstalled).map((j) => j.id),
    [memoSelectedMlJobs]
  );
  const { loading: mlInstalledJobLoading, jobs: installedJobs } =
    useGetInstalledJob(memoInstalledMlJobs);
  const memoMlIndices = useMemo(() => {
    const installedJobsIndices = installedJobs.map((j) => `.ml-anomalies-${j.results_index_name}`);
    return [...new Set(installedJobsIndices)];
  }, [installedJobs]);

  const memoRuleIndices = useMemo(() => {
    if (memoMlIndices.length > 0) {
      return memoMlIndices;
    } else if (esqlQuery) {
      return getIndexListFromEsqlQuery(esqlQuery);
    } else {
      return defaultRuleIndices ?? [];
    }
  }, [defaultRuleIndices, esqlQuery, memoMlIndices]);

  return {
    mlJobLoading: mlSecurityJobLoading || mlInstalledJobLoading,
    ruleIndices: memoRuleIndices,
  };
};
