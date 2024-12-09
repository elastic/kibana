/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { useAsyncConfirmation } from '../../../detection_engine/rule_management_ui/components/rules_table/rules_table/use_async_confirmation';
import { ConfirmValidationErrorsModal } from './confirm_validation_errors_modal';

interface UseFieldConfirmValidationErrorsModalResult {
  modal: ReactNode;
  confirmValidationErrors: (errorMessages: string[]) => Promise<boolean>;
}

export function useConfirmValidationErrorsModal(): UseFieldConfirmValidationErrorsModalResult {
  const [visible, { on: showModal, off: hideModal }] = useBoolean(false);
  const [initModal, confirm, cancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });
  const [errorsToConfirm, setErrorsToConfirm] = useState<string[]>([]);

  const confirmValidationErrors = useCallback(
    (errorMessages: string[]) => {
      if (errorMessages.length === 0) {
        return Promise.resolve(true);
      }

      setErrorsToConfirm(errorMessages);

      return initModal();
    },
    [initModal, setErrorsToConfirm]
  );

  const modal = useMemo(
    () =>
      visible ? (
        <ConfirmValidationErrorsModal
          errors={errorsToConfirm}
          onConfirm={confirm}
          onCancel={cancel}
        />
      ) : null,
    [visible, errorsToConfirm, confirm, cancel]
  );

  return {
    modal,
    confirmValidationErrors,
  };
}
