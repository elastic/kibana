/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';

import { getErrorMessage } from '../../../common/errors';
import type { SavedPlaygroundForm } from '../../types';
import { useSavedPlaygroundParameters } from '../../hooks/use_saved_playground_parameters';
import { useUpdateSavedPlayground } from '../../hooks/use_update_saved_playground';
import {
  buildSavedPlaygroundFromForm,
  hasSavedPlaygroundFormErrors,
} from '../../utils/saved_playgrounds';
import { useKibana } from '../../hooks/use_kibana';

export interface UseSavedPlaygroundSaveActionResult {
  onSave: () => void;
  isDisabled: boolean;
  isSaving: boolean;
}

export const useSavedPlaygroundSaveAction = (
  hasChanges: boolean
): UseSavedPlaygroundSaveActionResult => {
  const { playgroundId } = useSavedPlaygroundParameters();
  const { notifications } = useKibana().services;
  const {
    getValues,
    reset,
    formState: { errors: formErrors },
  } = useFormContext<SavedPlaygroundForm>();
  const { updateSavedPlayground, isLoading: isSaving } = useUpdateSavedPlayground();
  const hasErrors = hasSavedPlaygroundFormErrors(formErrors);

  const onSave = useCallback(() => {
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
          notifications.toasts.addError(error instanceof Error ? error : new Error(errorMessage), {
            title: i18n.translate('xpack.searchPlayground.savedPlayground.updateError.title', {
              defaultMessage: 'Error updating playground',
            }),
            toastMessage: errorMessage,
          });
        },
      }
    );
  }, [playgroundId, getValues, reset, updateSavedPlayground, notifications]);

  return {
    onSave,
    isDisabled: !hasChanges || hasErrors || isSaving,
    isSaving,
  };
};
