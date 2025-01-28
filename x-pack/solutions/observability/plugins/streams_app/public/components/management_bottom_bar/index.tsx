/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBottomBar, EuiButton, EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';

interface ManagementBottomBarProps {
  confirmButtonText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ManagementBottomBar({
  confirmButtonText = defaultConfirmButtonText,
  disabled = false,
  isLoading = false,
  onCancel,
  onConfirm,
}: ManagementBottomBarProps) {
  const handleCancel = useDiscardConfirm(onCancel);

  return (
    <EuiBottomBar>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} gutterSize="s">
        <EuiButtonEmpty
          data-test-subj="streamsAppManagementBottomBarCancelChangesButton"
          color="text"
          size="s"
          iconType="cross"
          onClick={handleCancel}
        >
          {i18n.translate('xpack.streams.streamDetailView.managementTab.bottomBar.cancel', {
            defaultMessage: 'Cancel changes',
          })}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="streamsAppManagementBottomBarButton"
          disabled={disabled}
          color="primary"
          fill
          size="s"
          iconType="check"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmButtonText}
        </EuiButton>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}

const defaultConfirmButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.confirm',
  { defaultMessage: 'Save changes' }
);
