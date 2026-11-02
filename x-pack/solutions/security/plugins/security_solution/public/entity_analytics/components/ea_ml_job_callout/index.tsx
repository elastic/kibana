/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import type { CallOutMessage } from '../../../common/components/callouts';
import { CallOutSwitcher } from '../../../common/components/callouts';
import { useInstalledSecurityJobs } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import * as i18n from './translations';

const eaMlJobCalloutMessage: CallOutMessage = {
  type: 'primary',
  id: 'ea-ml-job-callout',
  title: i18n.EA_ML_JOB_CALLOUT_TITLE,
  description: <i18n.EaMlJobCalloutBody />,
};

const EaMlJobCalloutComponent = () => {
  const { loading, jobs } = useInstalledSecurityJobs();
  const hasAffectedJobs = !loading && jobs.some((job) => !job.id.endsWith('_ea'));

  return (
    <CallOutSwitcher
      namespace="entityAnalytics"
      condition={hasAffectedJobs}
      message={eaMlJobCalloutMessage}
    />
  );
};

export const EaMlJobCallout = memo(EaMlJobCalloutComponent);
