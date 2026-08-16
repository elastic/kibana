/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { RuleUpgradeState } from '../../../../../rule_management/model/prebuilt_rule_upgrade';
import { useAsyncConfirmation } from '../../rules_table/use_async_confirmation';
import {
  buildMlLinkedJobUpgradeItems,
  type MlLinkedJobUpgradeItem,
} from './job_upgrade_items';
import {
  MlRuleJobUpgradeModal,
  type MlRuleJobUpgradeConfirmResult,
} from './ml_jobs_upgrade_modal';

export type { MlRuleJobUpgradeConfirmResult } from './ml_jobs_upgrade_modal';

interface UseMlRuleJobUpgradeModalResult {
  modal: ReactNode;
  /**
   * Opens the ML rule↔job upgrade consent modal when the selected rules
   * change linked ML jobs. Resolves `false` on cancel.
   */
  confirmMlRuleJobUpgrade: (
    rules: Array<Pick<RuleUpgradeState, 'rule_id' | 'current_rule' | 'target_rule'>>
  ) => Promise<false | MlRuleJobUpgradeConfirmResult>;
}

/**
 * Consent flow for tying ML job updates to detection rule upgrades.
 * Replaces the legacy V1/V2 → V3 warning-only modal for this prototype path.
 */
export function useOutdatedMlJobsUpgradeModal(): UseMlRuleJobUpgradeModalResult {
  const [isVisible, { on: showModal, off: hideModal }] = useBoolean(false);
  const [items, setItems] = useState<MlLinkedJobUpgradeItem[]>([]);

  const [initConfirmation, confirm, cancel] = useAsyncConfirmation<MlRuleJobUpgradeConfirmResult>({
    onInit: showModal,
    onFinish: hideModal,
  });

  const confirmMlRuleJobUpgrade = useCallback(
    async (
      rules: Array<Pick<RuleUpgradeState, 'rule_id' | 'current_rule' | 'target_rule'>>
    ): Promise<false | MlRuleJobUpgradeConfirmResult> => {
      const nextItems = buildMlLinkedJobUpgradeItems(rules);
      if (nextItems.length === 0) {
        // No linked job changes — proceed without blocking the user.
        return { updateJobs: false, duplicateOldJobs: false };
      }

      setItems(nextItems);
      const result = await initConfirmation();
      if (result === false) {
        return false;
      }
      return result as MlRuleJobUpgradeConfirmResult;
    },
    [initConfirmation]
  );

  return {
    modal: isVisible && (
      <MlRuleJobUpgradeModal items={items} onConfirm={confirm} onCancel={cancel} />
    ),
    confirmMlRuleJobUpgrade,
  };
}
