/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { useKibana } from '../../lib/kibana';
import { filterJobs } from './helpers';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import type { JobsFilters, SecurityJob } from './types';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { useEnableDataFeed } from './hooks/use_enable_data_feed';

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: false,
  selectedGroups: [],
};

/**
 * The ML job management UI (description, filters, jobs table, node/compatibility warnings), for a
 * user with a valid ML license and ML admin permissions. Shared by `MlPopover` and
 * `MlSettingsFlyout` so the two containers can't drift; renders `null` if the caller mounts it
 * without checking `isMlAdmin` first.
 */
export const MlJobSettingsContent = React.memo(() => {
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const {
    isMlAdmin,
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

  const filteredJobs = filterJobs({
    jobs,
    ...filterProperties,
  });

  const incompatibleJobCount = jobs.filter((j) => !j.isCompatible).length;
  const installedJobsIds = useMemo(
    () => jobs.filter((j) => j.isInstalled).map((j) => j.id),
    [jobs]
  );

  if (!isMlAdmin) {
    return null;
  }

  return (
    <>
      <PopoverDescription />

      <EuiSpacer />

      <JobsTableFilters securityJobs={jobs} onFilterChanged={setFilterProperties} />

      <ShowingCount filterResultsLength={filteredJobs.length} />

      <EuiSpacer size="m" />

      {incompatibleJobCount > 0 && (
        <>
          <EuiCallOut
            announceOnMount={false}
            title={i18n.MODULE_NOT_COMPATIBLE_TITLE(incompatibleJobCount)}
            color="warning"
            iconType="warning"
            size="s"
          >
            <p>
              <FormattedMessage
                defaultMessage="We could not find any data, see {mlDocs} for more information on Machine Learning job requirements."
                id="xpack.securitySolution.components.mlPopup.moduleNotCompatibleDescription"
                values={{
                  mlDocs: (
                    <a href={`${docLinks.links.siem.ml}`} rel="noopener noreferrer" target="_blank">
                      {i18n.ANOMALY_DETECTION_DOCS}
                    </a>
                  ),
                }}
              />
            </p>
          </EuiCallOut>

          <EuiSpacer size="m" />
        </>
      )}

      <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
      <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={setMlNodesAvailable} />
      <JobsTable
        isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
        jobs={filteredJobs}
        onJobStateChange={handleJobStateChange}
        mlNodesAvailable={mlNodesAvailable}
      />
    </>
  );
});

MlJobSettingsContent.displayName = 'MlJobSettingsContent';
