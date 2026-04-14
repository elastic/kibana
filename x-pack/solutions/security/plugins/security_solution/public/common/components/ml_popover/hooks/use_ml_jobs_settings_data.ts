/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../lib/kibana';
import { filterJobs } from '../helpers';
import type { JobsFilters, SecurityJob } from '../types';
import { useEnableDataFeed } from './use_enable_data_feed';
import { useSecurityJobs } from './use_security_jobs';

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: false,
  selectedGroups: [],
};

export interface MlJobsAdminViewModel {
  jobs: SecurityJob[];
  filteredJobs: SecurityJob[];
  filterProperties: JobsFilters;
  setFilterProperties: Dispatch<SetStateAction<JobsFilters>>;
  incompatibleJobCount: number;
  installedJobsIds: string[];
  isLoadingSecurityJobs: boolean;
  isLoadingEnableDataFeed: boolean;
  mlNodesAvailable: boolean;
  setMlNodesAvailable: Dispatch<SetStateAction<boolean>>;
  handleJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
  docLinks: ReturnType<typeof useKibana>['services']['docLinks'];
}

export type MlJobsSettingsData =
  | { variant: 'hidden' }
  | { variant: 'upgrade'; refreshJobs: () => void }
  | { variant: 'admin'; refreshJobs: () => void; admin: MlJobsAdminViewModel };

export const useMlJobsSettingsData = (): MlJobsSettingsData => {
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const {
    isMlAdmin,
    isLicensed,
    loading: isLoadingSecurityJobs,
    jobs,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const docLinks = useKibana().services.docLinks;
  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();

  const handleJobStateChange = useCallback(
    async (job: SecurityJob, latestTimestampMs: number, enable: boolean) => {
      if (enable) {
        await enableDatafeed(job, latestTimestampMs);
      } else {
        await disableDatafeed(job);
      }

      refreshJobs();
    },
    [refreshJobs, enableDatafeed, disableDatafeed]
  );

  const filteredJobs = useMemo(
    () =>
      filterJobs({
        jobs,
        ...filterProperties,
      }),
    [jobs, filterProperties]
  );

  const incompatibleJobCount = useMemo(() => jobs.filter((j) => !j.isCompatible).length, [jobs]);
  const installedJobsIds = useMemo(
    () => jobs.filter((j) => j.isInstalled).map((j) => j.id),
    [jobs]
  );

  if (!isLicensed) {
    return { variant: 'upgrade', refreshJobs };
  }

  if (!isMlAdmin) {
    return { variant: 'hidden' };
  }

  return {
    variant: 'admin',
    refreshJobs,
    admin: {
      jobs,
      filteredJobs,
      filterProperties,
      setFilterProperties,
      incompatibleJobCount,
      installedJobsIds,
      isLoadingSecurityJobs,
      isLoadingEnableDataFeed,
      mlNodesAvailable,
      setMlNodesAvailable,
      handleJobStateChange,
      docLinks,
    },
  };
};
