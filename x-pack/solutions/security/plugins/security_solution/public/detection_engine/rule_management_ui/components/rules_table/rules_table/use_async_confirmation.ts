/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

type UseAsyncConfirmationReturn<ConfirmResult = unknown> = [
  initConfirmation: () => Promise<ConfirmResult | boolean>,
  confirm: (result?: ConfirmResult) => void,
  cancel: () => void
];

interface UseAsyncConfirmationArgs {
  onInit: () => void;
  onFinish: () => void;
}

// TODO move to common hooks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAsyncConfirmation = <ConfirmResult = any>({
  onInit,
  onFinish,
}: UseAsyncConfirmationArgs): UseAsyncConfirmationReturn<ConfirmResult> => {
  const confirmationPromiseRef = useRef<(result: ConfirmResult | boolean) => void>();

  const confirm = useCallback((result?: ConfirmResult) => {
    confirmationPromiseRef.current?.(result ?? true);
  }, []);

  const cancel = useCallback(() => {
    confirmationPromiseRef.current?.(false);
  }, []);

  const initConfirmation = useCallback(() => {
    onInit();

    return new Promise<ConfirmResult | boolean>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      onFinish();
    });
  }, [onInit, onFinish]);

  return [initConfirmation, confirm, cancel];
};
