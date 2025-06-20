/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

import { useBoolState } from '../../../../common/hooks/use_bool_state';
import type { TimeRange } from '../../types';

/**
 * Hook that controls rule gaps filling confirmation modal window and its content
``
 */
export const useBulkFillRuleGapsConfirmation = () => {
  const [isBulkFillRuleGapsConfirmationVisible, showModal, hideModal] = useBoolState();
  const confirmationPromiseRef = useRef<(timerange: TimeRange | null) => void>();

  const onConfirm = useCallback((timerange: TimeRange) => {
    confirmationPromiseRef.current?.(timerange);
  }, []);

  const onCancel = useCallback(() => {
    confirmationPromiseRef.current?.(null);
  }, []);

  const initModal = useCallback(() => {
    showModal();

    return new Promise<TimeRange | null>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      hideModal();
    });
  }, [showModal, hideModal]);

  const showBulkFillRuleGapsConfirmation = useCallback(async () => {
    const confirmation = await initModal();
    if (confirmation) {
      onConfirm(confirmation);
    } else {
      onCancel();
    }

    return confirmation;
  }, [initModal, onConfirm, onCancel]);

  return {
    isBulkFillRuleGapsConfirmationVisible,
    showBulkFillRuleGapsConfirmation,
    cancelBulkFillRuleGaps: onCancel,
    confirmBulkFillRuleGaps: onConfirm,
  };
};
