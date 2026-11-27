/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MlJobUpdateReview } from '../../../../../../common/components/ml_popover/jobs_table/ml_job_update_review';
import { useSecurityJobs } from '../../../../../../common/components/ml_popover/hooks/use_security_jobs';
import type { SecurityJob } from '../../../../../../common/components/ml_popover/types';
import * as mlI18n from '../../../../../../common/components/ml_popover/translations';
import type { MlRuleJobUpgradeConfirmResult } from './ml_jobs_upgrade_modal';
import * as i18n from './translations';

interface MlJobUpdateReviewFlyoutProps {
  jobId: string;
  onBack: () => void;
  onConfirm: (result: MlRuleJobUpgradeConfirmResult) => void;
  onCancel: () => void;
}

const toStubSecurityJob = (jobId: string): SecurityJob =>
  ({
    id: jobId,
    description: '',
    groups: [],
    moduleId: '',
    defaultIndexPattern: '',
    isCompatible: true,
    isInstalled: true,
    isElasticJob: true,
  } as SecurityJob);

/**
 * Second-level ML job settings review opened from the rule↔job upgrade modal
 * when a linked job has breaking changes or customizations.
 */
export const MlJobUpdateReviewFlyout = memo(function MlJobUpdateReviewFlyout({
  jobId,
  onBack,
  onConfirm,
  onCancel,
}: MlJobUpdateReviewFlyoutProps): JSX.Element {
  const titleId = useGeneratedHtmlId({ prefix: 'mlJobUpdateReviewFlyout' });
  const { jobs } = useSecurityJobs();
  const [duplicateBeforeUpdate, setDuplicateBeforeUpdate] = useState(false);

  const job = useMemo(
    () => jobs.find((j) => j.id === jobId) ?? toStubSecurityJob(jobId),
    [jobId, jobs]
  );

  const handleConfirm = useCallback(() => {
    onConfirm({ updateJobs: true, duplicateOldJobs: duplicateBeforeUpdate });
  }, [duplicateBeforeUpdate, onConfirm]);

  return (
    <EuiFlyout
      onClose={onCancel}
      size="m"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="ml-job-update-review-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{mlI18n.REVIEW_ML_JOB_UPDATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <MlJobUpdateReview
          job={job}
          duplicateBeforeUpdate={duplicateBeforeUpdate}
          onDuplicateBeforeUpdateChange={setDuplicateBeforeUpdate}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType="arrowLeft"
              onClick={onBack}
              data-test-subj="ml-job-update-review-back"
            >
              {i18n.ML_RULE_JOB_UPGRADE_MODAL_REVIEW_BACK}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleConfirm} data-test-subj="ml-job-update-review-confirm">
              {mlI18n.CONFIRM_JOB_UPDATE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
