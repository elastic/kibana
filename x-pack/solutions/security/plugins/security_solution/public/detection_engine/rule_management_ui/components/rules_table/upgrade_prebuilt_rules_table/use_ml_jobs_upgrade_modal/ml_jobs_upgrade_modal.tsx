/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { MlLinkedJobUpgradeItem } from './job_upgrade_items';
import * as i18n from './translations';

export interface MlRuleJobUpgradeConfirmResult {
  updateJobs: boolean;
  duplicateOldJobs: boolean;
}

interface MlRuleJobUpgradeModalProps {
  items: MlLinkedJobUpgradeItem[];
  onCancel: () => void;
  onConfirm: (result: MlRuleJobUpgradeConfirmResult) => void;
}

export const MlRuleJobUpgradeModal = memo(function MlRuleJobUpgradeModal({
  items,
  onCancel,
  onConfirm,
}: MlRuleJobUpgradeModalProps): JSX.Element {
  const titleId = useGeneratedHtmlId();
  const duplicateCheckboxId = useGeneratedHtmlId({ prefix: 'duplicateOldMlJobs' });
  const [duplicateOldJobs, setDuplicateOldJobs] = useState(false);

  const hasBreaking = items.some((item) => item.kind === 'breaking_job_change');

  const handleConfirmWithJobs = useCallback(() => {
    onConfirm({ updateJobs: true, duplicateOldJobs });
  }, [duplicateOldJobs, onConfirm]);

  const handleRulesOnly = useCallback(() => {
    onConfirm({ updateJobs: false, duplicateOldJobs: false });
  }, [onConfirm]);

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={640}
      data-test-subj="mlRuleJobUpgradeModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.ML_RULE_JOB_UPGRADE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>{i18n.ML_RULE_JOB_UPGRADE_MODAL_DESCRIPTION}</p>
        </EuiText>

        <EuiSpacer size="m" />

        {hasBreaking && (
          <>
            <EuiCallOut
              title={i18n.ML_RULE_JOB_UPGRADE_MODAL_BREAKING_TITLE}
              color="warning"
              iconType="warning"
              size="s"
              data-test-subj="mlRuleJobUpgradeBreakingCallout"
            >
              <p>{i18n.ML_RULE_JOB_UPGRADE_MODAL_BREAKING_BODY}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiCallOut
          title={i18n.ML_RULE_JOB_UPGRADE_MODAL_AUTO_TITLE}
          color="primary"
          iconType="iInCircle"
          size="s"
        >
          <p>{i18n.ML_RULE_JOB_UPGRADE_MODAL_AUTO_BODY}</p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        <EuiTitle size="xs">
          <h3>{i18n.ML_RULE_JOB_UPGRADE_MODAL_JOBS_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFlexGroup direction="column" gutterSize="m">
          {items.map((item) => (
            <EuiFlexItem key={item.ruleId} grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiText size="s">
                    <strong>{item.ruleName}</strong>
                  </EuiText>
                </EuiFlexItem>
                {item.kind === 'breaking_job_change' && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">{i18n.ML_RULE_JOB_UPGRADE_MODAL_BREAKING_BADGE}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                <div>
                  {i18n.ML_RULE_JOB_UPGRADE_MODAL_CURRENT}:{' '}
                  <code>{i18n.jobIdsLabel(item.currentJobIds)}</code>
                </div>
                <div>
                  {i18n.ML_RULE_JOB_UPGRADE_MODAL_TARGET}:{' '}
                  <code>{i18n.jobIdsLabel(item.targetJobIds)}</code>
                </div>
              </EuiText>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiCheckbox
          id={duplicateCheckboxId}
          label={i18n.ML_RULE_JOB_UPGRADE_MODAL_DUPLICATE_LABEL}
          checked={duplicateOldJobs}
          onChange={(e) => setDuplicateOldJobs(e.target.checked)}
          data-test-subj="mlRuleJobUpgradeDuplicateCheckbox"
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>{i18n.ML_RULE_JOB_UPGRADE_MODAL_DUPLICATE_HELP}</p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="mlRuleJobUpgradeCancel">
          {i18n.ML_RULE_JOB_UPGRADE_MODAL_CANCEL}
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={handleRulesOnly} data-test-subj="mlRuleJobUpgradeRulesOnly">
          {i18n.ML_RULE_JOB_UPGRADE_MODAL_RULES_ONLY}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleConfirmWithJobs}
          data-test-subj="mlRuleJobUpgradeConfirm"
        >
          {i18n.ML_RULE_JOB_UPGRADE_MODAL_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
});
