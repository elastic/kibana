/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

interface ChangeHistoryFlyoutActionsProps {
  onClose: () => void;
}

export function ChangeHistoryFlyoutActions({
  onClose,
}: ChangeHistoryFlyoutActionsProps): JSX.Element {
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onClose} data-test-subj="ruleChangeHistoryFlyoutCloseButton">
          {i18n.CLOSE_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
