/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import type { MlJobsAdminViewModel } from './hooks/use_ml_jobs_settings_data';

export const MlJobsAdminFields = React.memo(({ admin }: { admin: MlJobsAdminViewModel }) => {
  const {
    jobs,
    filteredJobs,
    setFilterProperties,
    incompatibleJobCount,
    installedJobsIds,
    isLoadingSecurityJobs,
    isLoadingEnableDataFeed,
    mlNodesAvailable,
    setMlNodesAvailable,
    handleJobStateChange,
    docLinks,
  } = admin;

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

MlJobsAdminFields.displayName = 'MlJobsAdminFields';
