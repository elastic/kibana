/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../../../../common/translations';

interface BulkManualRuleRunRulesLimitErrorModalProps {
  onClose: () => void;
  message: string;
}

const BulkActionRuleLimitErrorModalComponent = ({
  onClose,
  message,
}: BulkManualRuleRunRulesLimitErrorModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.BULK_ACTION_LIMIT_ERROR_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{message}</EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          {i18n.BULK_ACTION_ERROR_MODAL_CLOSE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const BulkActionRuleLimitErrorModal = React.memo(BulkActionRuleLimitErrorModalComponent);

BulkActionRuleLimitErrorModal.displayName = 'BulkActionRuleLimitErrorModal';
