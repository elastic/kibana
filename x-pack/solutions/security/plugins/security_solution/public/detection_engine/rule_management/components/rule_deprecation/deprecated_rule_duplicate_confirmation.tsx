/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiText, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { useDuplicateOptionsRadioGroup } from '../../../rule_management_ui/components/rules_table/bulk_actions/duplicate_options_radio_group';
import * as i18n from './translations';

interface DeprecatedRuleDuplicateConfirmationProps {
  onCancel: () => void;
  onConfirm: (option: string) => void;
}

const DeprecatedRuleDuplicateConfirmationComponent = ({
  onCancel,
  onConfirm,
}: DeprecatedRuleDuplicateConfirmationProps) => {
  const { selectedOption, radioGroup } = useDuplicateOptionsRadioGroup({ rulesCount: 1 });

  const handleConfirm = useCallback(() => {
    onConfirm(selectedOption);
  }, [onConfirm, selectedOption]);

  return (
    <EuiConfirmModal
      aria-label={i18n.DUPLICATE_AND_DELETE_CONFIRMATION_TITLE}
      title={i18n.DUPLICATE_AND_DELETE_CONFIRMATION_TITLE}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.CANCEL_DELETE}
      confirmButtonText={i18n.DUPLICATE_AND_DELETE_CONFIRM_BUTTON}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      data-test-subj="deprecated-rule-duplicate-delete-confirm-modal"
    >
      <EuiText>{i18n.DUPLICATE_AND_DELETE_CONFIRMATION_DESCRIPTION}</EuiText>
      <EuiSpacer />
      {radioGroup}
    </EuiConfirmModal>
  );
};

export const DeprecatedRuleDuplicateConfirmation = React.memo(
  DeprecatedRuleDuplicateConfirmationComponent
);

DeprecatedRuleDuplicateConfirmation.displayName = 'DeprecatedRuleDuplicateConfirmation';
