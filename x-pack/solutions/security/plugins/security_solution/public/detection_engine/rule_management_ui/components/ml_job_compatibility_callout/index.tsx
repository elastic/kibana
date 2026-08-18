/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import hash from 'object-hash';

import type { CallOutMessage } from '../../../../common/components/callouts';
import { CallOut } from '../../../../common/components/callouts';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useTimedDismissal } from '../../../../common/hooks/use_timed_dismissal';
import { affectedJobIds } from '../../../../../common/machine_learning/affected_job_ids';
import { MlJobCompatibilityCalloutBody } from './callout_body';
import * as i18n from './translations';

const localStorageKey = (fingerprint: string) =>
  `securitySolution.detections.mlJobCompatibilityCallout.${fingerprint}.dismissedAt`;

const CALLOUT_DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const MlJobCompatibilityCalloutComponent = () => {
  const { loading, jobs } = useInstalledSecurityJobs();
  const affectedInstalledJobIds = useMemo(
    () =>
      jobs
        .map((job) => job.id)
        .filter((id) => affectedJobIds.includes(id))
        .sort(),
    [jobs]
  );

  // When the callout is dismissed, it will reappear in two cases:
  // 1. The set of affected installed job IDs changes (e.g. a new job is installed).
  // 2. The dismissal expires after 7 days (see `useTimedDismissal`).
  // The storage key is based on a hash of the set of affected installed job IDs.
  const storageKey = useMemo(() => {
    const fingerprint = hash(affectedInstalledJobIds);
    return localStorageKey(fingerprint);
  }, [affectedInstalledJobIds]);

  if (loading || affectedInstalledJobIds.length === 0) {
    return null;
  }

  // The storage key is used as a React `key` so the inner component remounts
  // whenever the set changes, causing `useTimedDismissal` to re-read the
  // set-specific storage key.
  return (
    <DismissibleMlJobCompatibilityCallout
      key={storageKey}
      storageKey={storageKey}
      affectedInstalledJobIds={affectedInstalledJobIds}
    />
  );
};

const DismissibleMlJobCompatibilityCallout = ({
  storageKey,
  affectedInstalledJobIds,
}: {
  storageKey: string;
  affectedInstalledJobIds: string[];
}) => {
  const [isDismissed, dismiss] = useTimedDismissal(storageKey, CALLOUT_DISMISS_DURATION);

  const message: CallOutMessage = useMemo(
    () => ({
      type: 'primary',
      id: 'ml-job-compatibility',
      title: i18n.ML_JOB_COMPATIBILITY_CALLOUT_TITLE,
      description: <MlJobCompatibilityCalloutBody jobIds={affectedInstalledJobIds} />,
    }),
    [affectedInstalledJobIds]
  );

  if (isDismissed) {
    return null;
  }

  return <CallOut message={message} onDismiss={dismiss} />;
};

export const MlJobCompatibilityCallout = memo(MlJobCompatibilityCalloutComponent);
