/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { EuiFocusTrapProps } from '@elastic/eui';

import { useBoolState } from '../../../../common/hooks/use_bool_state';
import type { TimeRange } from '../../../rule_gaps/types';

/**
 * Hook that controls the confirmation modal of a schedule bulk action such as manual run or fill gaps
 */
export const useScheduleBulkActionConfirmation = () => {
  const [isScheduleBulkActionConfirmationVisible, showModal, hideModal] = useBoolState();
  const confirmationPromiseRef = useRef<(timerange: TimeRange | null) => void>();
  const returnFocusElementRef = useRef<HTMLElement | null>(null);

  // The menu that opens the modal unmounts before the modal mounts, so EUI can't restore focus on its own.
  const focusTrapProps: Pick<EuiFocusTrapProps, 'returnFocus'> = useMemo(
    () => ({
      returnFocus: () => {
        const element = returnFocusElementRef.current;
        if (element?.isConnected) {
          element.focus();
          return false;
        }
        return true;
      },
    }),
    []
  );

  const onConfirm = useCallback((timerange: TimeRange) => {
    confirmationPromiseRef.current?.(timerange);
  }, []);

  const onCancel = useCallback(() => {
    confirmationPromiseRef.current?.(null);
  }, []);

  const initModal = useCallback(
    (triggerElement?: HTMLElement | null) => {
      returnFocusElementRef.current = triggerElement ?? null;
      showModal();

      return new Promise<TimeRange | null>((resolve) => {
        confirmationPromiseRef.current = resolve;
      }).finally(() => {
        hideModal();
      });
    },
    [showModal, hideModal]
  );

  const showScheduleBulkActionConfirmation = useCallback(
    async (triggerElement?: HTMLElement | null) => {
      const confirmation = await initModal(triggerElement);
      if (confirmation) {
        onConfirm(confirmation);
      } else {
        onCancel();
      }

      return confirmation;
    },
    [initModal, onConfirm, onCancel]
  );

  return {
    isScheduleBulkActionConfirmationVisible,
    showScheduleBulkActionConfirmation,
    cancelScheduleBulkAction: onCancel,
    confirmScheduleBulkAction: onConfirm,
    focusTrapProps,
  };
};
