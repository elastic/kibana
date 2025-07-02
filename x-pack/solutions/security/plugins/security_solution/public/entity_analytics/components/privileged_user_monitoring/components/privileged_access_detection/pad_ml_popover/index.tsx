/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiPopover, EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { PrivilegedAccessDetectionMLPopoverHeader } from './pad_ml_popover_header';
import { useEnableDataFeed } from '../../../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../../../common/components/ml_popover/types';
import { JobsTable } from '../../../../../../common/components/ml_popover/jobs_table/jobs_table';
import { usePadMlJobs } from './hooks/pad_get_jobs_hooks';

export const PrivilegedAccessDetectionMLPopover: React.FC = () => {
  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();

  const [searchValue, setSearchValue] = useState('');

  const { jobs, refreshJobs, isLoadingSecurityJobs, isMlAdmin } = usePadMlJobs(searchValue);

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

  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const installedJobsIds = jobs.filter((job) => job.isInstalled).map((job) => job.id);

  if (!isMlAdmin) return null;

  return (
    <>
      <EuiPopover
        anchorPosition="downRight"
        id="privileged-access-detections-popover"
        button={
          <EuiButtonEmpty
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.popupAria',
              { defaultMessage: 'Privileged Access Detection popup' }
            )}
            color="primary"
            data-test-subj="privileged-access-detections-popover-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              refreshJobs();
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.padMlJobsPopoverText',
              { defaultMessage: 'Privileged access detection ML Jobs' }
            )}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <EuiFlexGroup
          direction={'column'}
          css={css`
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            overflow-x: hidden;
            padding-bottom: 15px;
          `}
        >
          <PrivilegedAccessDetectionMLPopoverHeader />
          <EuiFieldSearch
            placeholder={i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.searchPlaceholder',
              { defaultMessage: 'e.g., Linux, Okta, etc.' }
            )}
            value={searchValue}
            fullWidth
            onChange={(e) => setSearchValue(e.target.value)}
            isClearable={true}
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.searchAria',
              { defaultMessage: 'Privileged access detection search box' }
            )}
          />
          <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
          <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={setMlNodesAvailable} />
          <JobsTable
            isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
            jobs={jobs}
            onJobStateChange={handleJobStateChange}
            mlNodesAvailable={mlNodesAvailable}
          />
        </EuiFlexGroup>
      </EuiPopover>
    </>
  );
};
