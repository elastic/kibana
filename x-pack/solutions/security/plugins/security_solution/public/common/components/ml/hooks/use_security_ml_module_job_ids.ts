/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ModuleJob } from '../../ml_popover/types';
import { GET_ALL_ML_MODULES_ROUTE, getAllMlModules } from '../api/get_all_ml_modules';
import {
  ML_GROUP_IDS,
  type LEGACY_ML_GROUP_ID,
  type ML_GROUP_ID,
} from '../../../../../common/constants';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from '../translations';
import { useMlCapabilities } from './use_ml_capabilities';

const GET_ALL_ML_MODULES_QUERY_KEY = ['GET', GET_ALL_ML_MODULES_ROUTE, 'unfiltered'];

const isSecurityModuleJob = (job: ModuleJob): boolean =>
  job.config.groups.some((group) =>
    ML_GROUP_IDS.includes(group as typeof ML_GROUP_ID | typeof LEGACY_ML_GROUP_ID)
  );

export interface UseSecurityMlModuleJobIdsReturn {
  jobIds: string[];
  loading: boolean;
}

/**
 * Returns the job IDs of all jobs in the `security`/`siem` ML group defined
 * across ML modules, whether installed or not. Mirrors the server's
 * `getSecurityMlJobIds`, which scopes the jobs the anomaly overview/summary
 * APIs search.
 */
export const useSecurityMlModuleJobIds = (): UseSecurityMlModuleJobIdsReturn => {
  const { addError } = useAppToasts();
  const mlCapabilities = useMlCapabilities();
  const isMlUser = hasMlUserPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);

  const { isFetching, data: modules = [] } = useQuery(
    GET_ALL_ML_MODULES_QUERY_KEY,
    async ({ signal }) => getAllMlModules({ signal }),
    {
      enabled: isMlUser && isLicensed,
      onError: (error) => {
        addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
      },
    }
  );

  const jobIds = useMemo(
    () => modules.flatMap((module) => module.jobs.filter(isSecurityModuleJob).map((job) => job.id)),
    [modules]
  );

  return { jobIds, loading: isFetching };
};
