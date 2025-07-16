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

import { getErrorMessage } from '../../../common/errors';
import {
  buildSavedPlaygroundFromForm,
  validatePlaygroundName,
} from '../../utils/saved_playgrounds';
import { SavedPlaygroundForm } from '../../types';
import { useSavePlayground } from '../../hooks/use_save_playground';
import { useKibana } from '../../hooks/use_kibana';

function makePlaygroundName(name?: string) {
  return name
    ? i18n.translate('xpack.searchPlayground.savedPlayground.nameCopy', {
        defaultMessage: '{name} (Copy)',
        values: { name },
      })
    : i18n.translate('xpack.searchPlayground.savedPlayground.defaultName', {
        defaultMessage: 'New Playground',
      });
}

export interface SavePlaygroundModalProps {
  playgroundName?: string;
  saveAs?: boolean;
  navigateToNewPlayground: (id: string) => void;
  onClose: () => void;
}

export const SavePlaygroundModal = ({
  navigateToNewPlayground,
  playgroundName,
  saveAs,
  onClose,
}: SavePlaygroundModalProps) => {
  const { getValues, reset } = useFormContext<SavedPlaygroundForm>();
  const { notifications } = useKibana().services;
  const [name, setName] = useState<string>(makePlaygroundName(playgroundName));
  const [nameError, setNameError] = useState<string | null>(
    validatePlaygroundName(makePlaygroundName(playgroundName))
  );
  const { savePlayground, isLoading } = useSavePlayground();
  const modalFormId = useGeneratedHtmlId({ prefix: 'savePlaygroundForm' });
  const modalTitleId = useGeneratedHtmlId();
  const onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError(validatePlaygroundName(e.target.value));
  }, []);
  const onSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();

      const formData = getValues();
      const newPlayground = {
        ...formData,
        name,
      };
      savePlayground(buildSavedPlaygroundFromForm(newPlayground), {
        onSuccess: (data) => {
          onClose();
          reset(newPlayground);
          navigateToNewPlayground(data._meta.id);
        },
        onError: (error) => {
          const errorMessage = getErrorMessage(error);
          notifications.toasts.addError(error instanceof Error ? error : new Error(errorMessage), {
            title: i18n.translate('xpack.searchPlayground.savedPlayground.saveError.title', {
              defaultMessage: 'Error saving playground',
            }),
            toastMessage: errorMessage,
          });
          onClose();
        },
      });
    },
    [navigateToNewPlayground, onClose, name, getValues, reset, notifications.toasts, savePlayground]
  );
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
          isLoading={isLoading}
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
