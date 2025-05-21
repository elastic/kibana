/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';

import * as i18n from './translations';

interface JobStatusBadgeProps {
  job: MlSummaryJob;
}

const MlJobStatusBadgeComponent: FC<JobStatusBadgeProps> = ({ job }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);
  const color = isStarted ? 'success' : 'danger';
  const text = isStarted ? i18n.ML_JOB_STARTED : i18n.ML_JOB_STOPPED;

  return (
    <EuiBadge data-test-subj="machineLearningJobStatus" color={color}>
      {text}
    </EuiBadge>
  );
};

export const MlJobStatusBadge = memo(MlJobStatusBadgeComponent);
