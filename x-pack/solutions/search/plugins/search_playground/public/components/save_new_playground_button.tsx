/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../hooks/use_kibana';
import { LOCAL_STORAGE_KEY as PLAYGROUND_SESSION_LOCAL_STORAGE_KEY } from '../providers/unsaved_form_provider';
import type { PlaygroundForm } from '../types';
import { PlaygroundPageMode } from '../types';
import { hasSavedPlaygroundFormErrors } from '../utils/saved_playgrounds';
import { SavePlaygroundModal } from './saved_playground/save_playground_modal';

export interface SaveNewPlaygroundButtonProps {
  disabled?: boolean;
  storage?: Storage;
}

export const SaveNewPlaygroundButton = ({
  disabled,
  storage = localStorage,
}: SaveNewPlaygroundButtonProps) => {
  const [showSavePlaygroundModal, setShowSavePlaygroundModal] = useState<boolean>(false);
  const { history } = useKibana().services;
  const {
    formState: { errors: formErrors },
  } = useFormContext<PlaygroundForm>();

  const hasErrors = hasSavedPlaygroundFormErrors(formErrors);
  const onSave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowSavePlaygroundModal(true);
  }, []);
  const onNavigateToNewPlayground = useCallback(
    (id: string) => {
      setShowSavePlaygroundModal(false);
      const path = `/p/${id}/${PlaygroundPageMode.Chat}`;
      storage.removeItem(PLAYGROUND_SESSION_LOCAL_STORAGE_KEY);
      history.push(path);
    },
    [history, storage]
  );

  return (
    <>
      <EuiButton
        data-test-subj="playground-save-button"
        size="s"
        iconType="save"
        fill
        isDisabled={hasErrors || disabled}
        onClick={onSave}
      >
        <FormattedMessage
          id="xpack.searchPlayground.header.saveButton.text"
          defaultMessage="Save"
        />
      </EuiButton>
      {showSavePlaygroundModal && (
        <SavePlaygroundModal
          onNavigateToNewPlayground={onNavigateToNewPlayground}
          onClose={() => setShowSavePlaygroundModal(false)}
        />
      )}
    </>
  );
};
