/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiText, EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';

import { bulkDuplicateRuleActions as i18n } from './translations';
import { useDuplicateOptionsRadioGroup } from './duplicate_options_radio_group';

interface BulkDuplicateExceptionsConfirmationProps {
  onCancel: () => void;
  onConfirm: (s: string) => void;
  rulesCount: number;
}

const BulkActionDuplicateExceptionsConfirmationComponent = ({
  onCancel,
  onConfirm,
  rulesCount,
}: BulkDuplicateExceptionsConfirmationProps) => {
  const { selectedOption, radioGroup } = useDuplicateOptionsRadioGroup({ rulesCount });

  const modalTitleId = useGeneratedHtmlId();

  const handleConfirm = useCallback(() => {
    onConfirm(selectedOption);
  }, [onConfirm, selectedOption]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.MODAL_TITLE(rulesCount)}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.CANCEL_BUTTON}
      confirmButtonText={i18n.CONTINUE_BUTTON}
      defaultFocusedButton="confirm"
      onCancel={onCancel}
    >
      <EuiText>{i18n.MODAL_TEXT(rulesCount)}</EuiText>

      <EuiSpacer />
      {radioGroup}
    </EuiConfirmModal>
  );
};

export const BulkActionDuplicateExceptionsConfirmation = React.memo(
  BulkActionDuplicateExceptionsConfirmationComponent
);

BulkActionDuplicateExceptionsConfirmation.displayName = 'BulkActionDuplicateExceptionsConfirmation';
