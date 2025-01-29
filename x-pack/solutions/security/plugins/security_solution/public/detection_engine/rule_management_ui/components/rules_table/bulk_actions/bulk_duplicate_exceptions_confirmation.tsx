/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiRadioGroup, EuiText, EuiConfirmModal, EuiSpacer, EuiIconTip } from '@elastic/eui';
import { DuplicateOptions } from '../../../../../../common/detection_engine/rule_management/constants';

import { bulkDuplicateRuleActions as i18n } from './translations';

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
  const [selectedDuplicateOption, setSelectedDuplicateOption] = useState(
    DuplicateOptions.withExceptions
  );

  const handleRadioChange = useCallback(
    (optionId: string) => {
      setSelectedDuplicateOption(optionId as DuplicateOptions);
    },
    [setSelectedDuplicateOption]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selectedDuplicateOption);
  }, [onConfirm, selectedDuplicateOption]);

  return (
    <EuiConfirmModal
      title={i18n.MODAL_TITLE(rulesCount)}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.CANCEL_BUTTON}
      confirmButtonText={i18n.CONTINUE_BUTTON}
      defaultFocusedButton="confirm"
      onCancel={onCancel}
    >
      <EuiText>{i18n.MODAL_TEXT(rulesCount)}</EuiText>

      <EuiSpacer />
      <EuiRadioGroup
        options={[
          {
            id: DuplicateOptions.withExceptions,
            label: (
              <EuiText size="s">
                {i18n.DUPLICATE_EXCEPTIONS_INCLUDE_EXPIRED_EXCEPTIONS_LABEL(rulesCount)}
                <EuiIconTip content={i18n.DUPLICATE_TOOLTIP} position="bottom" />
              </EuiText>
            ),
            'data-test-subj': DuplicateOptions.withExceptions,
          },
          {
            id: DuplicateOptions.withExceptionsExcludeExpiredExceptions,
            label: (
              <EuiText size="s">
                {i18n.DUPLICATE_EXCEPTIONS_TEXT(rulesCount)}
                <EuiIconTip content={i18n.DUPLICATE_TOOLTIP} position="bottom" />
              </EuiText>
            ),
            'data-test-subj': DuplicateOptions.withExceptionsExcludeExpiredExceptions,
          },
          {
            id: DuplicateOptions.withoutExceptions,
            label: i18n.DUPLICATE_WITHOUT_EXCEPTIONS_TEXT(rulesCount),
            'data-test-subj': DuplicateOptions.withoutExceptions,
          },
        ]}
        idSelected={selectedDuplicateOption}
        onChange={handleRadioChange}
      />
    </EuiConfirmModal>
  );
};

export const BulkActionDuplicateExceptionsConfirmation = React.memo(
  BulkActionDuplicateExceptionsConfirmationComponent
);

BulkActionDuplicateExceptionsConfirmation.displayName = 'BulkActionDuplicateExceptionsConfirmation';
