/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface RuleUpdateConfirmationToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const RuleUpdateConfirmationToast: React.FC<RuleUpdateConfirmationToastProps> = ({
  onUpdate,
  onDismiss,
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <span>{'Would you like to update the form with the generated rule?'}</span>
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onUpdate}
            data-test-subj="ai-rule-update-form-button"
          >
            {'Update form'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="text"
            onClick={onDismiss}
            data-test-subj="ai-rule-dismiss-button"
          >
            {'Dismiss'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

