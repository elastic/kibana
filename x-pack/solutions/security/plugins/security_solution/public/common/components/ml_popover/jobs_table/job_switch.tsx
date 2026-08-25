/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React, { useState, useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import {
  isJobLoading,
  isJobFailed,
  isJobStarted,
} from '../../../../../common/machine_learning/helpers';
import type { SecurityJob } from '../types';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface JobSwitchProps {
  job: SecurityJob;
  isSecurityJobsLoading: boolean;
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
}

export const JobSwitchComponent = ({
  job,
  isSecurityJobsLoading,
  onJobStateChange,
}: JobSwitchProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleChange: EuiSwitchProps['onChange'] = useCallback(
    async (e) => {
      setIsLoading(true);
      await onJobStateChange(job, job.latestTimestampMs || 0, e.target.checked);
      setIsLoading(false);
    },
    [job, setIsLoading, onJobStateChange]
  );

  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {isSecurityJobsLoading || isLoading || isJobLoading(job.jobState, job.datafeedState) ? (
          <EuiLoadingSpinner size="m" data-test-subj="job-switch-loader" />
        ) : (
          <StaticSwitch
            data-test-subj="job-switch"
            disabled={isJobFailed(job.jobState, job.datafeedState)}
            checked={isJobStarted(job.jobState, job.datafeedState)}
            onChange={handleChange}
            showLabel={false}
            label=""
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

JobSwitchComponent.displayName = 'JobSwitchComponent';

export const JobSwitch = React.memo(JobSwitchComponent);

JobSwitch.displayName = 'JobSwitch';
