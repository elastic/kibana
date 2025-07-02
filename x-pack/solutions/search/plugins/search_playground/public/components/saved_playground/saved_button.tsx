/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getErrorMessage } from '../../../common/errors';
import { SavedPlaygroundForm } from '../../types';
import { useSavedPlaygroundParameters } from '../../hooks/use_saved_playground_parameters';
import { useUpdateSavedPlayground } from '../../hooks/use_update_saved_playground';
import {
  buildSavedPlaygroundFromForm,
  hasSavedPlaygroundFormErrors,
} from '../../utils/saved_playgrounds';
import { useKibana } from '../../hooks/use_kibana';

export interface SavedPlaygroundSaveButtonProps {
  hasChanges: boolean;
}

export const SavedPlaygroundSaveButton = ({ hasChanges }: SavedPlaygroundSaveButtonProps) => {
  const { playgroundId } = useSavedPlaygroundParameters();
  const { notifications } = useKibana().services;
  const {
    getValues,
    reset,
    formState: { errors: formErrors },
  } = useFormContext<SavedPlaygroundForm>();
  const { updateSavedPlayground, isLoading: isSaving } = useUpdateSavedPlayground();
  const hasErrors = useMemo(() => hasSavedPlaygroundFormErrors(formErrors), [formErrors]);

  const onSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      const formData = getValues();
      updateSavedPlayground(
        {
          playgroundId,
          playground: buildSavedPlaygroundFromForm(formData),
        },
        {
          onSuccess: () => {
            reset(formData);
          },
          onError: (error) => {
            const errorMessage = getErrorMessage(error);
            notifications.toasts.addError(
              error instanceof Error ? error : new Error(errorMessage),
              {
                title: i18n.translate('xpack.searchPlayground.savedPlayground.updateError.title', {
                  defaultMessage: 'Error updating playground',
                }),
                toastMessage: errorMessage,
              }
            );
          },
        }
      );
    },
    [playgroundId, getValues, reset, updateSavedPlayground, notifications]
  );

  return (
    <EuiButton
      data-test-subj="saved-playground-save-button"
      size="s"
      iconType="save"
      fill
      isDisabled={!hasChanges || hasErrors || isSaving}
      isLoading={isSaving}
      onClick={onSave}
    >
      <FormattedMessage id="xpack.searchPlayground.header.saveButton.text" defaultMessage="Save" />
    </EuiButton>
  );
};
