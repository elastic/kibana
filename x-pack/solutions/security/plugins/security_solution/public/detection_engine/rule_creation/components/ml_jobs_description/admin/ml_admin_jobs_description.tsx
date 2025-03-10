/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import { useSecurityJobs } from '../../../../../common/components/ml_popover/hooks/use_security_jobs';

import { MlAdminJobDescription } from './ml_admin_job_description';

interface MlAdminJobsDescriptionProps {
  jobIds: string[];
}

const MlAdminJobsDescriptionComponent: FC<MlAdminJobsDescriptionProps> = ({ jobIds }) => {
  const { loading, jobs, refetch: refreshJobs, isMlAdmin } = useSecurityJobs();

  if (!isMlAdmin) {
    return null;
  }

  const relevantJobs = jobs.filter((job) => jobIds.includes(job.id));

  return (
    <>
      {relevantJobs.map((job) => (
        <MlAdminJobDescription key={job.id} job={job} loading={loading} refreshJob={refreshJobs} />
      ))}
    </>
  );
};

export const MlAdminJobsDescription = memo(MlAdminJobsDescriptionComponent);
