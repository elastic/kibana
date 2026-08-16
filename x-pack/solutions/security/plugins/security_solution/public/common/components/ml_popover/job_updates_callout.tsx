/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { SecurityJob } from './types';
import * as i18n from './translations';

interface JobUpdatesCalloutProps {
  jobs: SecurityJob[];
}

export const JobUpdatesCallout = React.memo(({ jobs }: JobUpdatesCalloutProps) => {
  const outdatedCount = useMemo(
    () => jobs.filter((job) => job.isInstalled && job.isUpdateAvailable).length,
    [jobs]
  );

  if (outdatedCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount={false}
        data-test-subj="ml-job-updates-available-callout"
        title={i18n.JOB_UPDATES_AVAILABLE_TITLE(outdatedCount)}
        color="primary"
        iconType="refresh"
        size="s"
      >
        <p>{i18n.JOB_UPDATES_AVAILABLE_DESCRIPTION}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
});

JobUpdatesCallout.displayName = 'JobUpdatesCallout';
