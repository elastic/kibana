/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';
import {
  explainLackOfPermission,
  hasUserCRUDPermission,
} from '../../../../common/utils/privileges';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { useUserData } from '../../../../detections/components/user_info';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

export interface UseHighlightedFieldsPrivilegeParams {
  /**
   * The rule to be edited
   */
  rule: RuleResponse | null;
  /**
   * Whether the rule exists
   */
  isExistingRule: boolean;
}

interface UseHighlightedFieldsPrivilegeResult {
  /**
   * Whether edit highlighted fields button is disabled
   */
  isDisabled: boolean;
  /**
   * The tooltip content
   */
  tooltipContent: string;
}

/**
 * Returns whether the edit highlighted fields button is disabled and the tooltip content
 */
export const useHighlightedFieldsPrivilege = ({
  rule,
  isExistingRule,
}: UseHighlightedFieldsPrivilegeParams): UseHighlightedFieldsPrivilegeResult => {
  const [{ canUserCRUD }] = useUserData();
  const mlCapabilities = useMlCapabilities();
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

  const isEditRuleDisabled =
    !rule ||
    !isExistingRule ||
    !hasUserCRUDPermission(canUserCRUD) ||
    (isMlRule(rule?.type) && !hasMlPermissions);

  const upsellingMessage = usePrebuiltRuleCustomizationUpsellingMessage(
    'prebuilt_rule_customization'
  );

  const isDisabled = isEditRuleDisabled || (Boolean(upsellingMessage) && rule?.immutable);

  const tooltipContent = useMemo(() => {
    const explanation = explainLackOfPermission(
      rule,
      hasMlPermissions,
      true, // default true because we don't need the message for lack of action privileges
      canUserCRUD
    );

    if (isEditRuleDisabled && explanation) {
      return explanation;
    }
    if (isEditRuleDisabled && (!isExistingRule || !rule)) {
      return i18n.translate(
        'xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsDeletedRuleTooltip',
        { defaultMessage: 'Deleted rule cannot be edited.' }
      );
    }
    if (upsellingMessage && rule?.immutable) {
      return i18n.translate(
        'xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButtonUpsellingTooltip',
        {
          defaultMessage: '{upsellingMessage}',
          values: { upsellingMessage },
        }
      );
    }
    return i18n.translate(
      'xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButtonTooltip',
      { defaultMessage: 'Edit highlighted fields' }
    );
  }, [canUserCRUD, hasMlPermissions, isEditRuleDisabled, isExistingRule, rule, upsellingMessage]);

  return useMemo(
    () => ({
      isDisabled,
      tooltipContent,
    }),
    [isDisabled, tooltipContent]
  );
};
