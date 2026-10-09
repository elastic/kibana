/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AppHeaderBadge } from '@kbn/app-header';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
} from '../../../../common/utils/privileges';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import * as ruleDetailsI18n from '../../../rule_management/components/rule_details/translations';
import type { Rule } from '../../../rule_management/logic';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import * as i18n from './translations';

interface UseRuleDetailsBadgesProps {
  rule: Rule | null;
  ruleLoading: boolean;
  isExistingRule: boolean;
  hasActionsPrivileges: boolean;
  onRuleEnabledChange: (enabled: boolean) => void;
  startMlJobsIfNeeded: () => Promise<void>;
}

/** Builds the rule details header badges: enabled state (with enable/disable menu), modified, and deleted. */
export const useRuleDetailsBadges = ({
  rule,
  ruleLoading,
  isExistingRule,
  hasActionsPrivileges,
  onRuleEnabledChange,
  startMlJobsIfNeeded,
}: UseRuleDetailsBadgesProps): AppHeaderBadge[] => {
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: true });
  const {
    actions: { openCustomizationsPreviewFlyout },
    state: { doesBaseVersionExist },
  } = useRuleCustomizationsContext();
  const canEnableDisableRules = useUserPrivileges().rulesPrivileges.enableDisable.edit;
  const mlCapabilities = useMlCapabilities();
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);
  const [isEnabledChangeLoading, setIsEnabledChangeLoading] = useState(false);

  const isEnabled = isExistingRule && (rule?.enabled ?? false);
  const enabledChangeDisabled =
    !rule ||
    !isExistingRule ||
    !canEditRuleWithActions(rule, hasActionsPrivileges) ||
    !canEnableDisableRules ||
    (isMlRule(rule?.type) && !hasMlPermissions) ||
    isEnabledChangeLoading;

  const changeEnabled = useCallback(
    async (enabled: boolean) => {
      if (!rule) return;
      setIsEnabledChangeLoading(true);
      try {
        startTransaction({
          name: enabled ? SINGLE_RULE_ACTIONS.ENABLE : SINGLE_RULE_ACTIONS.DISABLE,
        });
        if (enabled) await startMlJobsIfNeeded();
        const result = await executeBulkAction({
          type: enabled ? BulkActionTypeEnum.enable : BulkActionTypeEnum.disable,
          ids: [rule.id],
        });
        const updated = result?.attributes.results.updated[0];
        if (updated) onRuleEnabledChange(updated.enabled);
      } finally {
        setIsEnabledChangeLoading(false);
      }
    },
    [executeBulkAction, onRuleEnabledChange, rule, startMlJobsIfNeeded, startTransaction]
  );

  return useMemo<AppHeaderBadge[]>(() => {
    if (ruleLoading) return [];

    if (!isExistingRule) {
      return [{ label: i18n.DELETED_RULE, 'data-test-subj': 'ruleDetailsDeletedRuleBadge' }];
    }

    const badges: AppHeaderBadge[] = [
      {
        label: isEnabled ? i18n.ENABLED_BADGE : i18n.DISABLED_BADGE,
        color: isEnabled ? 'primary' : 'hollow',
        'data-test-subj': 'ruleDetailsEnabledBadge',
        items: [
          {
            name: isEnabled ? i18n.DISABLE_RULE : i18n.ENABLE_RULE,
            icon: isEnabled ? 'pause' : 'play',
            onClick: () => changeEnabled(!isEnabled),
            disabled: enabledChangeDisabled,
            toolTipContent: explainLackOfPermission(
              rule,
              hasMlPermissions,
              hasActionsPrivileges,
              canEnableDisableRules
            ),
            'data-test-subj': 'ruleDetailsEnabledToggle',
          },
        ],
      },
    ];

    if (rule && isCustomizedPrebuiltRule(rule)) {
      badges.push(
        doesBaseVersionExist
          ? {
              label: ruleDetailsI18n.MODIFIED_PREBUILT_RULE_LABEL,
              tooltip: ruleDetailsI18n.MODIFIED_PREBUILT_DIFF_TOOLTIP_CONTENT,
              onClick: openCustomizationsPreviewFlyout,
              'data-test-subj': 'modified-prebuilt-rule-badge',
            }
          : {
              label: ruleDetailsI18n.MODIFIED_PREBUILT_RULE_LABEL,
              tooltip: ruleDetailsI18n.NO_BASE_VERSION_MODIFIED_PREBUILT_DIFF_TOOLTIP_CONTENT,
              'data-test-subj': 'modified-prebuilt-rule-badge-no-base-version',
            }
      );
    }

    return badges;
  }, [
    ruleLoading,
    isExistingRule,
    isEnabled,
    changeEnabled,
    enabledChangeDisabled,
    rule,
    hasMlPermissions,
    hasActionsPrivileges,
    canEnableDisableRules,
    doesBaseVersionExist,
    openCustomizationsPreviewFlyout,
  ]);
};
