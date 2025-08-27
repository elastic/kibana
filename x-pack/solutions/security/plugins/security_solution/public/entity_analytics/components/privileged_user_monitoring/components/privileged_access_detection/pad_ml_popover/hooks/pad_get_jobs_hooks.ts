/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSecurityJobs } from '../../../../../../../common/components/ml_popover/hooks/use_security_jobs';
import { searchFilter } from '../../../../../../../common/components/ml_popover/helpers';

export const usePadMlJobs = (searchValue: string) => {
  const {
    isMlAdmin,
    loading: isLoadingSecurityJobs,
    jobs,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const allPrivilegedAccessDetectionJobs = jobs.filter((job) => job.groups.includes('pad'));

  const filteredPrivilegedAccessDetectionJobs = searchFilter(
    allPrivilegedAccessDetectionJobs,
    searchValue
  );

  return {
    jobs: filteredPrivilegedAccessDetectionJobs,
    refreshJobs,
    isMlAdmin,
    isLoadingSecurityJobs,
  };
};
