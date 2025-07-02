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
import { SavedPlaygroundForm, SavedPlaygroundFormFields } from '../../types';

export interface EditPlaygroundNameModalProps {
  playgroundName: string;
  onClose: () => void;
}

export const EditPlaygroundNameModal = ({
  playgroundName,
  onClose,
}: EditPlaygroundNameModalProps) => {
  const { setValue } = useFormContext<SavedPlaygroundForm>();
  const [name, setName] = useState<string>(playgroundName);
  const [nameError, setNameError] = useState<string | null>(null);
  const modalFormId = useGeneratedHtmlId({ prefix: 'editPlaygroundNameForm' });
  const modalTitleId = useGeneratedHtmlId();
  const onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError(validatePlaygroundName(e.target.value));
  }, []);
  const onSave = useCallback(
    (newName: string) => {
      setValue(SavedPlaygroundFormFields.name, newName, { shouldDirty: true });
      onClose();
    },
    [setValue, onClose]
  );
  const isInvalid = nameError !== null;

  return (
    <EuiModal initialFocus="[name=playgroundName]" aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.searchPlayground.savedPlayground.nameEditModal.title"
            defaultMessage="Edit playground name"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={modalFormId} component="form">
          <EuiFormRow
            label={i18n.translate(
              'xpack.searchPlayground.savedPlayground.nameEditModal.name.label',
              { defaultMessage: 'Name' }
            )}
            isInvalid={isInvalid}
            error={nameError ? [nameError] : undefined}
          >
            <EuiFieldText
              data-test-subj="searchPlaygroundEditPlaygroundNameModalFieldText"
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
          data-test-subj="searchPlaygroundEditPlaygroundNameModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.searchPlayground.savedPlayground.nameEditModal.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="searchPlaygroundEditPlaygroundNameModalSaveButton"
          type="submit"
          form={modalFormId}
          disabled={isInvalid}
          onClick={() => onSave(name)}
          fill
        >
          <FormattedMessage
            id="xpack.searchPlayground.savedPlayground.nameEditModal.save"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
