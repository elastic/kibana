/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useRef, useCallback } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { UpgradeWithSolvableConflictsModal } from './upgrade_solvable_confirm_modal';

export enum UpgradeModalConfirmLevels {
  Solvable = 'solvable',
  NoConflict = 'no_conflict',
  Cancel = 'cancel',
}

interface UseUpgradeWithSolvableConflictsModalResult {
  modal: ReactNode;
  confirmConflictsUpgrade: () => Promise<UpgradeModalConfirmLevels>;
}

export function useUpgradeWithSolvableConflictsModal(): UseUpgradeWithSolvableConflictsModalResult {
  const [isVisible, { on: showModal, off: hideModal }] = useBoolean(false);
  const [confirmConflictsUpgrade, confirmSolvable, confirmNoConflict, cancel] =
    useAsyncUpgradeModalConfirmation({
      onInit: showModal,
      onFinish: hideModal,
    });

  return {
    modal: isVisible && (
      <UpgradeWithSolvableConflictsModal
        onSolvableConflictConfirm={confirmSolvable}
        onNoConflictConfirm={confirmNoConflict}
        onCancel={cancel}
      />
    ),
    confirmConflictsUpgrade,
  };
}

type UseAsyncUpgradeModalConfirmation = [
  initConfirmation: () => Promise<UpgradeModalConfirmLevels>,
  confirmSolvable: () => void,
  confirmNoConflict: () => void,
  cancel: () => void
];

interface UseAsyncUpgradeModalConfirmationArgs {
  onInit: () => void;
  onFinish: () => void;
}

const useAsyncUpgradeModalConfirmation = ({
  onInit,
  onFinish,
}: UseAsyncUpgradeModalConfirmationArgs): UseAsyncUpgradeModalConfirmation => {
  const confirmationPromiseRef = useRef<(result: UpgradeModalConfirmLevels) => void>();

  const confirmSolvable = useCallback(() => {
    confirmationPromiseRef.current?.(UpgradeModalConfirmLevels.Solvable);
  }, []);

  const confirmNoConflict = useCallback(() => {
    confirmationPromiseRef.current?.(UpgradeModalConfirmLevels.NoConflict);
  }, []);

  const cancel = useCallback(() => {
    confirmationPromiseRef.current?.(UpgradeModalConfirmLevels.Cancel);
  }, []);

  const initConfirmation = useCallback(() => {
    onInit();

    return new Promise<UpgradeModalConfirmLevels>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      onFinish();
    });
  }, [onInit, onFinish]);

  return [initConfirmation, confirmSolvable, confirmNoConflict, cancel];
};
