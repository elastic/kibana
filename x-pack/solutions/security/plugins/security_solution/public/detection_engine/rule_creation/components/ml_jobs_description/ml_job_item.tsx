/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import * as i18n from './translations';

import { isJobStarted } from '../../../../../common/machine_learning/helpers';

import { MlJobLink } from '../ml_job_link/ml_job_link';
import { MlAuditIcon } from '../ml_audit_icon';
import { MlJobStatusBadge } from '../ml_job_status_badge';

const MlJobItemComponent: FC<{
  job: MlSummaryJob;
  switchComponent: ReactNode;
}> = ({ job, switchComponent, ...props }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);
  const { euiTheme } = useEuiTheme();
  const containerStyles = css`
    overflow: hidden;
    margin-bottom: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles} {...props}>
      <div>
        <MlJobLink jobId={job.id} jobName={job.customSettings?.security_app_display_name} />
        <MlAuditIcon message={job.auditMessage} />
      </div>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false} style={{ marginRight: '0' }}>
          <MlJobStatusBadge job={job} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{switchComponent}</EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: '0' }} data-test-subj="mlJobActionLabel">
          {isStarted ? i18n.ML_STOP_JOB_LABEL : i18n.ML_RUN_JOB_LABEL}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export const MlJobItem = memo(MlJobItemComponent);
