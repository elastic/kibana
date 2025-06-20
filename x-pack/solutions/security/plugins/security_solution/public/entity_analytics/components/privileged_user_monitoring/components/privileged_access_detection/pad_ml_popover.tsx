/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useNavigation } from '@kbn/security-solution-navigation';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHeaderSectionItemButton,
  EuiFlexGroup,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiFieldSearch,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { useIntegrationLinkState } from '../../../../../common/hooks/integrations/use_integration_link_state';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../../common/constants';
import { usePrivilegedAccessDetectionIntegration } from '../../../privileged_user_monitoring_onboarding/hooks/use_integrations';
import { INTEGRATION_APP_ID } from '../../../../../common/lib/integrations/constants';
import { addPathParamToUrl } from '../../../../../common/utils/integrations';
import { useSecurityJobs } from '../../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useEnableDataFeed } from '../../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../../common/components/ml_popover/types';
import { JobsTable } from '../../../../../common/components/ml_popover/jobs_table/jobs_table';
import { searchFilter } from '../../../../../common/components/ml_popover/helpers';

const PopoverDescription: React.FC = () => {
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const { navigateTo } = useNavigation();
  const padPackage = usePrivilegedAccessDetectionIntegration();
  const navigateToPadIntegration = useCallback(() => {
    navigateTo({
      appId: INTEGRATION_APP_ID,
      path: addPathParamToUrl(
        `/detail/${padPackage?.name}-${padPackage?.version}/overview`,
        ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
      ),
      state,
    });
  }, [navigateTo, padPackage, state]);

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.padMlJobsDescription"
          defaultMessage="Run privileged access detection jobs to monitor anomalous behaviors of privileged users in your environment. Note that some jobs may require additional manual steps configured in order to fully function. See the {integrationLink} for details"
          values={{
            integrationLink: (
              <EuiLink external onClick={navigateToPadIntegration}>
                {'Privileged access detection integration'}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};

export const PrivilegedAccessDetectionMLPopover: React.FC = () => {
  const {
    isMlAdmin,
    loading: isLoadingSecurityJobs,
    jobs,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();

  const [searchValue, setsearchValue] = useState('');

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

  const allPrivilegedAccessDetectionJobs = jobs.filter((job) => job.groups.includes('pad'));

  const filteredPrivilegedAccessDetectionJobs = searchFilter(
    allPrivilegedAccessDetectionJobs,
    searchValue
  );

  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const installedJobsIds = filteredPrivilegedAccessDetectionJobs
    .filter((job) => job.isInstalled)
    .map((job) => job.id);

  if (!isMlAdmin) return null;

  return (
    <>
      <EuiPopover
        anchorPosition="downRight"
        id="privileged-access-detections-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={''} // todo i18n
            color="primary"
            data-test-subj="privileged-access-detections-popover-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              refreshJobs();
            }}
            textProps={{ style: { fontSize: '1rem' } }}
          >
            {'Privileged access detection ML Jobs'}
          </EuiHeaderSectionItemButton>
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
          <PopoverDescription />
          <EuiFieldSearch
            placeholder="e.g., Linux, Okta, etc." // TODO i18n
            value={searchValue}
            fullWidth
            onChange={(e) => setsearchValue(e.target.value)}
            isClearable={true}
            aria-label="privileged-access-detection-search" // TODO i18n
          />
          <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
          <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={setMlNodesAvailable} />
          <JobsTable
            isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
            jobs={filteredPrivilegedAccessDetectionJobs}
            onJobStateChange={handleJobStateChange}
            mlNodesAvailable={mlNodesAvailable}
          />
        </EuiFlexGroup>
      </EuiPopover>
    </>
  );
};
