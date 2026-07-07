/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useRef } from 'react';

import { useBoolState } from '../../../../../common/hooks/use_bool_state';

/**
 * hook that controls bulk duplicate actions exceptions confirmation modal window and its content
 */
export const useBulkDuplicateExceptionsConfirmation = () => {
  const [isBulkDuplicateConfirmationVisible, showModal, hideModal] = useBoolState();
  const confirmationPromiseRef = useRef<(result: string | null) => void>();

  const onConfirm = useCallback((value: string) => {
    confirmationPromiseRef.current?.(value);
  }, []);

  const onCancel = useCallback(() => {
    confirmationPromiseRef.current?.(null);
  }, []);

  const initModal = useCallback(() => {
    showModal();

    return new Promise<string | null>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      hideModal();
    });
  }, [showModal, hideModal]);

  const showBulkDuplicateConfirmation = useCallback(async () => {
    const confirmation = await initModal();
    if (confirmation) {
      onConfirm(confirmation);
    } else {
      onCancel();
    }

    return confirmation;
  }, [initModal, onConfirm, onCancel]);

  return {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation,
    cancelRuleDuplication: onCancel,
    confirmRuleDuplication: onConfirm,
  };
};
