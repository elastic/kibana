/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { AffectedMlJobsModal } from './affected_ml_jobs_modal';
import * as i18n from './translations';

/**
 * How many affected job IDs to show inline in the callout before collapsing the rest behind a
 * "View all" modal. Keeps the callout compact when many jobs are affected.
 */
export const MAX_VISIBLE_AFFECTED_JOBS = 3;

/**
 * Body of the ML job compatibility callout: a summary, the list of affected (legacy) installed ML
 * job IDs, and a documentation link. When there are more than `MAX_VISIBLE_AFFECTED_JOBS` affected
 * jobs, only the first few are shown inline and the full list is available via a modal.
 */
export const MlJobCompatibilityCalloutBody = ({ jobIds }: { jobIds: string[] }) => {
  const [isModalOpen, openModal, closeModal] = useBoolState();
  const visibleJobIds = jobIds.slice(0, MAX_VISIBLE_AFFECTED_JOBS);
  const hasHiddenJobs = jobIds.length > MAX_VISIBLE_AFFECTED_JOBS;

  return (
    <>
      <i18n.MlJobCompatibilitySummary />
      <i18n.AffectedJobsTitle count={jobIds.length} />

      <ul data-test-subj="mlJobCompatibilityCalloutAffectedJobs">
        {visibleJobIds.map((jobId) => (
          <li key={jobId}>
            <EuiCode>{jobId}</EuiCode>
          </li>
        ))}
      </ul>

      {hasHiddenJobs && (
        <p>
          <EuiLink onClick={openModal} data-test-subj="mlJobCompatibilityViewAllAffectedJobs">
            {i18n.VIEW_ALL_AFFECTED_JOBS(jobIds.length)}
          </EuiLink>
        </p>
      )}

      <i18n.MlJobCompatibilityDocs />
      {isModalOpen && <AffectedMlJobsModal jobIds={jobIds} onClose={closeModal} />}
    </>
  );
};
