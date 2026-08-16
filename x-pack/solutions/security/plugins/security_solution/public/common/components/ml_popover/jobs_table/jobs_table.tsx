/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import { useMlManagementHref, ML_PAGES } from '@kbn/ml-plugin/public';
import { PopoverItems } from '../../popover_items';
import { useKibana } from '../../../lib/kibana';
import * as i18n from './translations';
import { JobSwitch } from './job_switch';
import type { SecurityJob } from '../types';

const JobNameWrapper = styled.div`
  margin: 5px 0;
`;

JobNameWrapper.displayName = 'JobNameWrapper';

// TODO: Use SASS mixin @include EuiTextTruncate when we switch from styled components
const truncateThreshold = 200;

interface JobNameProps {
  id: string;
  name?: string;
  description: string;
  isUpdateAvailable?: boolean;
  installedJobRevision?: number;
  packagedJobRevision?: number;
}

const JobName = ({
  id,
  name,
  description,
  isUpdateAvailable,
  installedJobRevision,
  packagedJobRevision,
}: JobNameProps) => {
  const {
    services: { ml },
  } = useKibana();

  const jobUrl = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: id,
    },
  });

  return (
    <JobNameWrapper>
      <EuiText size="s">
        <EuiLink data-test-subj="jobs-table-link" href={jobUrl} target="_blank">
          {name ?? id}
        </EuiLink>
        {isUpdateAvailable && (
          <>
            {' '}
            <EuiBadge color="primary" data-test-subj="ml-job-update-available-badge">
              {i18n.UPDATE_AVAILABLE_BADGE}
              {packagedJobRevision != null && (
                <>
                  {` (r${installedJobRevision ?? 0} → r${packagedJobRevision})`}
                </>
              )}
            </EuiBadge>
          </>
        )}
      </EuiText>
      <EuiText color="subdued" size="xs">
        {description.length > truncateThreshold
          ? `${description.substring(0, truncateThreshold)}...`
          : description}
      </EuiText>
    </JobNameWrapper>
  );
};
const getJobsTableColumns = (
  isLoading: boolean,
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>,
  mlNodesAvailable: boolean
) => [
  {
    name: i18n.COLUMN_JOB_NAME,
    render: ({
      id,
      description,
      customSettings,
      isUpdateAvailable,
      installedJobRevision,
      packagedJobRevision,
    }: SecurityJob) => (
      <JobName
        id={id}
        name={customSettings?.security_app_display_name ?? id}
        description={description}
        isUpdateAvailable={isUpdateAvailable}
        installedJobRevision={installedJobRevision}
        packagedJobRevision={packagedJobRevision}
      />
    ),
  },
  {
    name: i18n.COLUMN_GROUPS,
    render: ({ groups }: SecurityJob) => {
      const renderItem = (group: string, i: number) => (
        <EuiBadge color="hollow" key={`${group}-${i}`} data-test-subj="group">
          {group}
        </EuiBadge>
      );

      return (
        <PopoverItems
          items={groups}
          numberOfItemsToDisplay={0}
          popoverButtonTitle={`${groups.length} Groups`}
          renderItem={renderItem}
          dataTestPrefix="groups"
        />
      );
    },
    width: '80px',
  },

  {
    name: i18n.COLUMN_RUN_JOB,
    render: (job: SecurityJob) => {
      // Show the on/off switch when ML nodes exist and the job can be run: either the
      // module matches available data, the job is already installed (start/stop), or it
      // is a Fleet integration job (compatibility is against package indices, not SIEM defaults).
      const showSwitch =
        mlNodesAvailable && (job.isCompatible || job.isInstalled || Boolean(job.isIntegrationJob));

      return showSwitch ? (
        <JobSwitch
          job={job}
          isSecurityJobsLoading={isLoading}
          onJobStateChange={onJobStateChange}
        />
      ) : (
        <EuiIcon aria-label="Warning" size="s" type="warning" color="warning" />
      );
    },
    align: CENTER_ALIGNMENT,
    width: '80px',
  } as const,
];

const getPaginatedItems = (
  items: SecurityJob[],
  pageIndex: number,
  pageSize: number
): SecurityJob[] => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

export interface JobTableProps {
  isLoading: boolean;
  jobs: SecurityJob[];
  mlNodesAvailable: boolean;
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
  noItemsMessage?: React.ReactNode;
}

export const JobsTableComponent = ({
  isLoading,
  jobs,
  onJobStateChange,
  mlNodesAvailable,
  noItemsMessage,
}: JobTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 5;

  const pagination = {
    showPerPageOptions: false,
    pageIndex,
    pageSize,
    totalItemCount: jobs.length,
  };

  useEffect(() => {
    setPageIndex(0);
  }, [jobs.length]);

  return (
    <EuiBasicTable
      data-test-subj="jobs-table"
      tableCaption={i18n.JOBS_TABLE_CAPTION}
      columns={getJobsTableColumns(isLoading, onJobStateChange, mlNodesAvailable)}
      items={getPaginatedItems(jobs, pageIndex, pageSize)}
      loading={isLoading}
      noItemsMessage={noItemsMessage ?? <NoItemsMessage />}
      pagination={pagination}
      responsiveBreakpoint={false}
      onChange={({ page }: { page: { index: number } }) => {
        setPageIndex(page.index);
      }}
    />
  );
};

JobsTableComponent.displayName = 'JobsTableComponent';

export const JobsTable = React.memo(JobsTableComponent);

JobsTable.displayName = 'JobsTable';

export const NoItemsMessage = React.memo(() => {
  const {
    services: { ml },
  } = useKibana();

  const createNewAnomalyDetectionJobUrl = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
  });

  return (
    <EuiEmptyPrompt
      title={<h3>{i18n.NO_ITEMS_TEXT}</h3>}
      titleSize="xs"
      actions={
        <EuiButton
          href={createNewAnomalyDetectionJobUrl}
          iconType="external"
          iconSide="right"
          size="s"
          target="_blank"
        >
          {i18n.CREATE_CUSTOM_JOB}
        </EuiButton>
      }
    />
  );
});

NoItemsMessage.displayName = 'NoItemsMessage';
