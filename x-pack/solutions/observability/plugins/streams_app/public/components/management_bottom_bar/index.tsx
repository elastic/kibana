/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBottomBar, EuiButton, EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { DiscardChangesModal } from '../stream_detail_enrichment/discard_changes_modal';

interface ManagementBottomBarProps {
  confirmButtonText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
}

export function ManagementBottomBar({
  confirmButtonText = defaultConfirmButtonText,
  disabled = false,
  isLoading = false,
  onCancel,
  onConfirm,
}: ManagementBottomBarProps) {
  const [isDiscardModalOpen, { on: openDiscardModal, off: closeDiscardModal }] = useBoolean();

  const discardChanges = () => {
    closeDiscardModal();
    if (onCancel) onCancel();
  };

  return (
    <>
      <EuiBottomBar>
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          responsive={false}
          gutterSize="s"
        >
          {onCancel && (
            <EuiButtonEmpty color="text" size="s" iconType="cross" onClick={openDiscardModal}>
              {i18n.translate('xpack.streams.streamDetailView.managementTab.bottomBar.cancel', {
                defaultMessage: 'Cancel changes',
              })}
            </EuiButtonEmpty>
          )}
          {onConfirm && (
            <EuiButton
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
          )}
        </EuiFlexGroup>
      </EuiBottomBar>
      {isDiscardModalOpen && (
        <DiscardChangesModal onCancel={closeDiscardModal} onConfirm={discardChanges} />
      )}
    </>
  );
}

const defaultConfirmButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.confirm',
  { defaultMessage: 'Save changes' }
);
