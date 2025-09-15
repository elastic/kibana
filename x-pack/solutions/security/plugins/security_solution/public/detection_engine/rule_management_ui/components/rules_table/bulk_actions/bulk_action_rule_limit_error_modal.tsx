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
} from '@elastic/eui';

interface BulkManualRuleRunRulesLimitErrorModalProps {
  onClose: () => void;
  text: {
    title: string;
    message: string;
    closeButton: string;
  };
}

const BulkActionRuleLimitErrorModalComponent = ({
  onClose,
  text,
}: BulkManualRuleRunRulesLimitErrorModalProps) => {
  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{text.title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{text.message}</EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          {text.closeButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const BulkActionRuleLimitErrorModal = React.memo(BulkActionRuleLimitErrorModalComponent);

BulkActionRuleLimitErrorModal.displayName = 'BulkActionRuleLimitErrorModal';
