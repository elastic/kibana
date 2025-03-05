/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiConfirmModal,
} from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import { ConfirmRulesUpgrade } from './use_upgrade_modal';
import * as i18n from './translations';

export interface RulesConflictStats {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}

interface UpgradeWithConflictsModalProps extends RulesConflictStats {
  onCancel: () => void;
  onConfirm: (result: ConfirmRulesUpgrade) => void;
}

export const UpgradeWithConflictsModal = memo(function ConfirmUpgradeWithConflictsModal({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
  numOfRulesWithNonSolvableConflicts,
  onCancel,
  onConfirm,
}: UpgradeWithConflictsModalProps): JSX.Element {
  const confirmUpgradingRulesWithoutConflicts = useCallback(
    () => onConfirm(ConfirmRulesUpgrade.WithoutConflicts),
    [onConfirm]
  );
  const confirmUpgradingRulesWithSolvableConflicts = useCallback(
    () => onConfirm(ConfirmRulesUpgrade.WithSolvableConflicts),
    [onConfirm]
  );

  // Only solvable conflicts
  if (numOfRulesWithoutConflicts === 0 && numOfRulesWithNonSolvableConflicts === 0) {
    return (
      <EuiConfirmModal
        title={i18n.UPGRADE_CONFLICTS_MODAL_TITLE}
        onCancel={onCancel}
        onConfirm={confirmUpgradingRulesWithSolvableConflicts}
        cancelButtonText={i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}
        confirmButtonText={i18n.UPGRADE_RULES_WITH_CONFLICTS}
        buttonColor="warning"
        defaultFocusedButton="cancel"
        data-test-subj="upgradeConflictsModal"
      >
        <EuiText>
          {i18n.ONLY_RULES_WITH_SOLVABLE_CONFLICTS(numOfRulesWithSolvableConflicts)}
        </EuiText>
      </EuiConfirmModal>
    );
  }

  // Only non-solvable conflicts
  if (numOfRulesWithoutConflicts === 0 && numOfRulesWithSolvableConflicts === 0) {
    return (
      <EuiModal data-test-subj="upgradeConflictsModal" onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.UPGRADE_CONFLICTS_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            {i18n.ONLY_RULES_WITH_NON_SOLVABLE_CONFLICTS(numOfRulesWithNonSolvableConflicts)}
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  // Rules without conflicts + rules with non-solvable conflicts
  if (numOfRulesWithSolvableConflicts === 0) {
    return (
      <EuiConfirmModal
        title={i18n.UPGRADE_CONFLICTS_MODAL_TITLE}
        onCancel={onCancel}
        onConfirm={confirmUpgradingRulesWithoutConflicts}
        cancelButtonText={i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}
        confirmButtonText={i18n.UPGRADE_RULES_WITHOUT_CONFLICTS}
        buttonColor="primary"
        defaultFocusedButton="cancel"
        data-test-subj="upgradeConflictsModal"
      >
        <EuiText>
          {i18n.RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_NON_SOLVABLE_CONFLICTS({
            numOfRulesWithoutConflicts,
            numOfRulesWithNonSolvableConflicts,
          })}
        </EuiText>
      </EuiConfirmModal>
    );
  }

  return (
    <EuiModal data-test-subj="upgradeConflictsModal" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.UPGRADE_CONFLICTS_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {i18n.ALL_KINDS_OF_RULES({
            numOfRulesWithoutConflicts,
            numOfRulesWithSolvableConflicts,
            numOfRulesWithNonSolvableConflicts,
          })}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={confirmUpgradingRulesWithoutConflicts}>
          {i18n.UPGRADE_RULES_WITHOUT_CONFLICTS}
        </EuiButton>
        <EuiButton onClick={confirmUpgradingRulesWithSolvableConflicts} color="warning">
          {i18n.UPGRADE_RULES_WITH_CONFLICTS}
        </EuiButton>
        <EuiButtonEmpty onClick={onCancel}>{i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}</EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
});
