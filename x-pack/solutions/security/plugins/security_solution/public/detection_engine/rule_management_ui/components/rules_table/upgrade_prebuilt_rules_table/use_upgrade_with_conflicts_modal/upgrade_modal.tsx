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
  useGeneratedHtmlId,
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

  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal
      data-test-subj="upgradeConflictsModal"
      onClose={onCancel}
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.UPGRADE_CONFLICTS_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {getModalBodyText({
            numOfRulesWithoutConflicts,
            numOfRulesWithSolvableConflicts,
            numOfRulesWithNonSolvableConflicts,
          })}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        {numOfRulesWithoutConflicts > 0 && (
          <EuiButton onClick={confirmUpgradingRulesWithoutConflicts}>
            {i18n.UPGRADE_RULES_WITHOUT_CONFLICTS(numOfRulesWithoutConflicts)}
          </EuiButton>
        )}
        {numOfRulesWithSolvableConflicts > 0 && (
          <EuiButton onClick={confirmUpgradingRulesWithSolvableConflicts} color="warning">
            {i18n.UPGRADE_RULES_WITH_CONFLICTS(
              numOfRulesWithoutConflicts + numOfRulesWithSolvableConflicts
            )}
          </EuiButton>
        )}
        <EuiButtonEmpty onClick={onCancel}>{i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}</EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
});

function getModalBodyText({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
  numOfRulesWithNonSolvableConflicts,
}: RulesConflictStats): JSX.Element {
  // Only solvable conflicts
  if (numOfRulesWithoutConflicts === 0 && numOfRulesWithNonSolvableConflicts === 0) {
    return i18n.ONLY_RULES_WITH_SOLVABLE_CONFLICTS(numOfRulesWithSolvableConflicts);
  }

  // Only non-solvable conflicts
  if (numOfRulesWithoutConflicts === 0 && numOfRulesWithSolvableConflicts === 0) {
    return i18n.ONLY_RULES_WITH_NON_SOLVABLE_CONFLICTS(numOfRulesWithNonSolvableConflicts);
  }

  // Only conflicts
  if (numOfRulesWithoutConflicts === 0) {
    return i18n.ONLY_RULES_WITH_CONFLICTS({
      numOfRulesWithSolvableConflicts,
      numOfRulesWithNonSolvableConflicts,
    });
  }

  // Rules without conflicts + rules with solvable conflicts
  if (numOfRulesWithNonSolvableConflicts === 0) {
    return i18n.RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_SOLVABLE_CONFLICTS({
      numOfRulesWithoutConflicts,
      numOfRulesWithSolvableConflicts,
    });
  }

  // Rules without conflicts + rules with non-solvable conflicts
  if (numOfRulesWithSolvableConflicts === 0) {
    return i18n.RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_NON_SOLVABLE_CONFLICTS({
      numOfRulesWithoutConflicts,
      numOfRulesWithNonSolvableConflicts,
    });
  }

  return i18n.ALL_KINDS_OF_RULES({
    numOfRulesWithoutConflicts,
    numOfRulesWithSolvableConflicts,
    numOfRulesWithNonSolvableConflicts,
  });
}
