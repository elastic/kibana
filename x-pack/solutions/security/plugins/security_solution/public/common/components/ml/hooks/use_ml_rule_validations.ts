/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { useInstalledSecurityJobs } from './use_installed_security_jobs';

export interface UseMlRuleValidationsParams {
  machineLearningJobId: string[] | undefined;
}

export interface UseMlRuleValidationsReturn {
  loading: boolean;
  noJobsStarted: boolean;
  allJobsStarted: boolean;
}

/**
 * Hook to encapsulate some of our validation checks for ML rules.
 *
 * @param machineLearningJobId the ML Job IDs of the rule
 * @returns validation state about the rule, relative to its ML jobs.
 */
export const useMlRuleValidations = ({
  machineLearningJobId,
}: UseMlRuleValidationsParams): UseMlRuleValidationsReturn => {
  const { jobs: installedJobs, loading } = useInstalledSecurityJobs();
  const ruleMlJobs = installedJobs.filter((installedJob) =>
    (machineLearningJobId ?? []).includes(installedJob.id)
  );
  const numberOfRuleMlJobsStarted = ruleMlJobs.filter((job) =>
    isJobStarted(job.jobState, job.datafeedState)
  ).length;
  const noMlJobsStarted = numberOfRuleMlJobsStarted === 0;
  const allMlJobsStarted = !noMlJobsStarted && numberOfRuleMlJobsStarted === ruleMlJobs.length;

  return { loading, noJobsStarted: noMlJobsStarted, allJobsStarted: allMlJobsStarted };
};
