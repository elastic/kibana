/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SchemaEditorUnpromotingState } from './hooks/use_unpromoting_state';

export const UnpromoteFieldModal = ({
  unpromotingState,
}: {
  unpromotingState: SchemaEditorUnpromotingState;
}) => {
  const { setSelectedField, selectedField, unpromoteField, isUnpromotingField } = unpromotingState;

  const modalTitleId = useGeneratedHtmlId();

  if (!selectedField) return null;

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={() => setSelectedField(undefined)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{selectedField}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.unpromoteFieldModal.unpromoteFieldWarning', {
          defaultMessage: 'Are you sure you want to unmap this field from template mappings?',
        })}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          data-test-subj="streamsAppUnpromoteFieldModalCloseButton"
          onClick={() => unpromoteField()}
          disabled={isUnpromotingField}
          color="danger"
          fill
        >
          {i18n.translate('xpack.streams.unpromoteFieldModal.unpromoteFieldButtonLabel', {
            defaultMessage: 'Unmap field',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
