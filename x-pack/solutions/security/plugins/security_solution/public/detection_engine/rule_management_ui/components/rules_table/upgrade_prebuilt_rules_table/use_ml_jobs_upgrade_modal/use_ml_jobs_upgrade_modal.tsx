/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { useInstalledSecurityJobs } from '../../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { affectedJobIds } from '../../../../../../../common/machine_learning/affected_job_ids';
import { useAsyncConfirmation } from '../../rules_table/use_async_confirmation';
import { OutdatedMlJobsUpgradeModal } from './ml_jobs_upgrade_modal';

interface UseOutdatedMlJobsUpgradeModalResult {
  modal: ReactNode;
  isLoading: boolean;
  confirmLegacyMLJobs: () => Promise<boolean>;
}

export function useOutdatedMlJobsUpgradeModal(): UseOutdatedMlJobsUpgradeModalResult {
  const [isVisible, { on: showModal, off: hideModal }] = useBoolean(false);
  const { loading, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));
  const [confirmLegacyMLJobs, confirm, cancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  const handleLegacyMLJobsConfirm = useCallback(async () => {
    if (legacyJobsInstalled.length > 0) {
      return confirmLegacyMLJobs();
    }

    return true;
  }, [confirmLegacyMLJobs, legacyJobsInstalled]);

  return {
    modal: isVisible && (
      <OutdatedMlJobsUpgradeModal jobs={jobs} onConfirm={confirm} onCancel={cancel} />
    ),
    confirmLegacyMLJobs: handleLegacyMLJobsConfirm,
    isLoading: loading,
  };
}
