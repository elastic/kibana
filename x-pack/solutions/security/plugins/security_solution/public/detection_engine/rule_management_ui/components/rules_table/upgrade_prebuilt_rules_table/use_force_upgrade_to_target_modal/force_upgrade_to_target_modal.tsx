/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { RuleUpgradeCustomizationCounts } from '../../../../../rule_management/model/prebuilt_rule_upgrade';
import {
  FORCE_UPGRADE_TO_TARGET_MODAL_CANCEL,
  FORCE_UPGRADE_TO_TARGET_MODAL_CONFIRM,
  FORCE_UPGRADE_TO_TARGET_MODAL_TITLE,
  ForceUpgradeToTargetModalBody,
} from './translations';

export interface ForceUpgradeToTargetModalProps extends RuleUpgradeCustomizationCounts {
  dataTestSubj: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Danger-styled single-confirm-action modal warning that force-upgrading to the
 * Elastic version will permanently discard customizations on `customizedCount`
 * of the `total` rules in scope and apply any rule type changes.
 */
export const ForceUpgradeToTargetModal = ({
  total,
  customizedCount,
  ruleTypeChangeCount,
  dataTestSubj,
  onConfirm,
  onCancel,
}: ForceUpgradeToTargetModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={FORCE_UPGRADE_TO_TARGET_MODAL_TITLE(total)}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={FORCE_UPGRADE_TO_TARGET_MODAL_CANCEL}
      confirmButtonText={FORCE_UPGRADE_TO_TARGET_MODAL_CONFIRM}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      data-test-subj={dataTestSubj}
    >
      <ForceUpgradeToTargetModalBody
        total={total}
        customizedCount={customizedCount}
        ruleTypeChangeCount={ruleTypeChangeCount}
      />
    </EuiConfirmModal>
  );
};
