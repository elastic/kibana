/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiRadioGroup,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CONFIRM_MODAL_TITLE, CONFIRM_MODAL_CANCEL, CONFIRM_MODAL_CONFIRM } from './translations';
import { CONFIRM_RESOLUTION_MODAL_TEST_ID } from './test_ids';
import { getEntityId } from './helpers';

interface ConfirmResolutionModalProps {
  currentEntity: Record<string, unknown>;
  newEntity: Record<string, unknown>;
  onConfirm: (targetId: string, aliasId: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ConfirmResolutionModal: React.FC<ConfirmResolutionModalProps> = ({
  currentEntity,
  newEntity,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const currentId = getEntityId(currentEntity);
  const newId = getEntityId(newEntity);

  // Default: current entity becomes the target (golden)
  const [selectedOption, setSelectedOption] = useState<string>('current_as_target');

  const options = [
    {
      id: 'current_as_target',
      label: i18n.translate(
        'xpack.securitySolution.entityResolution.confirmModal.resolveNewToCurrent',
        {
          defaultMessage: 'Resolve {newId} to {currentId}',
          values: { newId, currentId },
        }
      ),
    },
    {
      id: 'new_as_target',
      label: i18n.translate(
        'xpack.securitySolution.entityResolution.confirmModal.resolveCurrentToNew',
        {
          defaultMessage: 'Resolve {currentId} to {newId}',
          values: { currentId, newId },
        }
      ),
    },
  ];

  const handleConfirm = useCallback(() => {
    if (selectedOption === 'current_as_target') {
      onConfirm(currentId, newId);
    } else {
      onConfirm(newId, currentId);
    }
  }, [selectedOption, currentId, newId, onConfirm]);

  return (
    <EuiModal onClose={onCancel} data-test-subj={CONFIRM_RESOLUTION_MODAL_TEST_ID}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{CONFIRM_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          {i18n.translate('xpack.securitySolution.entityResolution.confirmModal.description', {
            defaultMessage:
              'Both entity records will be maintained, but one will become the target entity for this resolution group.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiRadioGroup options={options} idSelected={selectedOption} onChange={setSelectedOption} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} disabled={isLoading}>
          {CONFIRM_MODAL_CANCEL}
        </EuiButtonEmpty>
        <EuiButton onClick={handleConfirm} fill isLoading={isLoading}>
          {CONFIRM_MODAL_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
