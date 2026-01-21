/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

interface EnableWiredStreamsConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function EnableWiredStreamsConfirmModal({
  onCancel,
  onConfirm,
  isLoading = false,
}: EnableWiredStreamsConfirmModalProps) {
  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby="enableWiredStreamsModalTitle"
      data-test-subj="observabilityOnboardingEnableWiredStreamsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="enableWiredStreamsModalTitle">
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.title', {
            defaultMessage: 'Enable Wired Streams?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.description', {
          defaultMessage:
            'Wired Streams is currently in tech preview. This will enable the feature for your entire cluster.',
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          disabled={isLoading}
          data-test-subj="observabilityOnboardingEnableWiredStreamsCancelButton"
        >
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          color="primary"
          fill
          isLoading={isLoading}
          onClick={onConfirm}
          data-test-subj="observabilityOnboardingEnableWiredStreamsConfirmButton"
        >
          {i18n.translate('xpack.observability_onboarding.enableWiredStreamsModal.confirmButton', {
            defaultMessage: 'Enable Wired Streams',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
