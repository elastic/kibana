/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { RuleUpgradeCustomizationCounts } from '../../../../../rule_management/model/prebuilt_rule_upgrade';
import { useAsyncConfirmation } from '../../rules_table/use_async_confirmation';
import { ForceUpgradeToTargetModal } from './force_upgrade_to_target_modal';

export interface UseForceUpgradeToTargetModalResult {
  modal: ReactNode;
  confirmForceUpgradeToTarget: (counts: RuleUpgradeCustomizationCounts) => Promise<boolean>;
}

interface UseForceUpgradeToTargetModalArgs {
  dataTestSubj: string;
}

/**
 * Independent per-invocation confirmation gate for force-upgrading a rule set to the
 * Elastic (TARGET) version. Skips the modal entirely when the target set is known to contain
 * neither customized rules nor rule type changes; otherwise shows a danger-styled confirmation
 * naming the counts and resolves only once the user confirms or cancels.
 *
 * Holds no module-level or shared state, so instantiate once per invocation scope and
 * confirming/cancelling one instance can never resolve or dismiss another.
 */
export function useForceUpgradeToTargetModal({
  dataTestSubj,
}: UseForceUpgradeToTargetModalArgs): UseForceUpgradeToTargetModalResult {
  const [isVisible, { on: showModal, off: hideModal }] = useBoolean(false);
  const [selectedCounts, setSelectedCounts] = useState<RuleUpgradeCustomizationCounts | null>(null);
  const [initConfirmation, confirm, cancel] = useAsyncConfirmation<boolean>({
    onInit: showModal,
    onFinish: hideModal,
  });
  const handleConfirm = useCallback(() => confirm(true), [confirm]);

  const confirmForceUpgradeToTarget = useCallback(
    async (counts: RuleUpgradeCustomizationCounts) => {
      if (counts.customizedCount === 0 && counts.ruleTypeChangeCount === 0) {
        return true;
      }

      setSelectedCounts(counts);

      return initConfirmation();
    },
    [initConfirmation]
  );

  return {
    modal: isVisible && selectedCounts !== null && (
      <ForceUpgradeToTargetModal
        total={selectedCounts.total}
        customizedCount={selectedCounts.customizedCount}
        ruleTypeChangeCount={selectedCounts.ruleTypeChangeCount}
        dataTestSubj={dataTestSubj}
        onConfirm={handleConfirm}
        onCancel={cancel}
      />
    ),
    confirmForceUpgradeToTarget,
  };
}
