/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { validatePlaygroundName } from '../../utils/saved_playgrounds';
import { SavedPlaygroundForm } from '../../types';

function makePlaygroundName(name?: string) {
  return name ? `${name} (Copy)` : '';
}

export interface SavePlaygroundModalProps {
  playgroundName?: string;
  saveAs?: boolean;
  onClose: () => void;
}

export const SavePlaygroundModal = ({
  playgroundName,
  saveAs,
  onClose,
}: SavePlaygroundModalProps) => {
  const { getValues } = useFormContext<SavedPlaygroundForm>();
  const [name, setName] = useState<string>(makePlaygroundName(playgroundName));
  const [nameError, setNameError] = useState<string | null>(
    validatePlaygroundName(makePlaygroundName(playgroundName))
  );
  const modalFormId = useGeneratedHtmlId({ prefix: 'savePlaygroundForm' });
  const modalTitleId = useGeneratedHtmlId();
  const onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError(validatePlaygroundName(e.target.value));
  }, []);
  const onSave = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
  }, []);
  const isSaving = false;
  const isInvalid = nameError !== null;

  return (
    <EuiModal
      initialFocus="[name=playgroundName]"
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="save-playground-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {saveAs ? (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.savePlaygroundModal.title"
              defaultMessage="Save playground as"
            />
          ) : (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.savePlaygroundModal.title"
              defaultMessage="Save playground"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={modalFormId} component="form">
          <EuiFormRow
            label={i18n.translate(
              'xpack.searchPlayground.savedPlayground.savePlaygroundModal.name.label',
              { defaultMessage: 'Name' }
            )}
            isInvalid={isInvalid}
            error={nameError ? [nameError] : undefined}
          >
            <EuiFieldText
              data-test-subj="searchPlaygroundSavePlaygroundModalFieldText"
              name="playgroundName"
              value={name}
              onChange={onNameChange}
              isInvalid={isInvalid}
              required
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="searchPlaygroundSavePlaygroundModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.searchPlayground.savedPlayground.savePlaygroundModal.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="searchPlaygroundSavePlaygroundModalSaveButton"
          type="submit"
          iconType="save"
          form={modalFormId}
          disabled={isInvalid}
          onClick={onSave}
          isLoading={isSaving}
          fill
        >
          {saveAs ? (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.savePlaygroundModal.saveAs"
              defaultMessage="Save as"
            />
          ) : (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.savePlaygroundModal.save"
              defaultMessage="Save"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
