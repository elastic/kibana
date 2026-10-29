/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import type { ChangeEvent, SyntheticEvent } from 'react';
import { useState, useCallback } from 'react';
import * as i18n from '../../translations';
import type { ListDetails } from '../../types';

/**
 * Persists the edited list details. Resolves once the save succeeded; rejects when it failed,
 * in which case the modal stays open so the user can retry.
 */
export type EditModalOnSave = (newListDetails: ListDetails) => Promise<void>;

interface UseEditModal {
  listDetails: ListDetails;
  onSave: EditModalOnSave;
}

export const useEditModal = ({ listDetails, onSave }: UseEditModal) => {
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });
  const [newListDetails, setNewListDetails] = useState<ListDetails>(listDetails);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onBlur = useCallback(
    ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { name, value } = target;
      const trimmedValue = value.trim();
      setNewListDetails({ ...newListDetails, [name]: trimmedValue });
      if (name === 'name') setError(!trimmedValue ? i18n.LIST_NAME_REQUIRED_ERROR : undefined);
    },
    [newListDetails]
  );

  const onChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = target;
    setNewListDetails({ ...newListDetails, [name]: value });
  };

  const onSubmit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    if (error) return;
    setShowProgress(true);
    try {
      await onSave(newListDetails);
    } catch {
      // The owner of `onSave` reports the failure; the modal only needs to stay open.
    } finally {
      setShowProgress(false);
    }
  };
  return {
    error,
    modalFormId,
    newListDetails,
    showProgress,
    onBlur,
    onChange,
    onSubmit,
  };
};
