/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showErrorToast } from '../../../../common/components/utils';
import { useToasts } from '../../../../common/lib/kibana';
import { usePerformRulesUpgradeMutation } from '../../api/hooks/prebuilt_rules/use_perform_rules_upgrade_mutation';

import * as i18n from './translations';

export const usePerformUpgradeRules = () => {
  const toasts = useToasts();

  return usePerformRulesUpgradeMutation({
    onError: (error) => {
      showErrorToast({
        title: i18n.RULE_UPGRADE_FAILED,
        fullMessage: JSON.stringify(error, null, 2),
        toasts,
      });
    },
    onSuccess: (result, vars) => {
      if (vars.dry_run) {
        // This is a preflight check, no need to show toast
        return;
      }

      const successToastMessage = getSuccessToastMessage(result);
      if (successToastMessage) {
        toasts.addSuccess(getSuccessToastMessage(result));
      }

      if (result.summary.failed > 0) {
        showErrorToast({
          title: i18n.UPGRADE_RULE_FAILED(result.summary.failed),
          fullMessage: JSON.stringify(result.errors, null, 2),
          toasts,
        });
      }
    },
  });
};

const getSuccessToastMessage = (result: {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}) => {
  const toastMessage: string[] = [];
  const {
    summary: { succeeded, skipped },
  } = result;
  if (succeeded > 0) {
    toastMessage.push(i18n.UPGRADE_RULE_SUCCESS(succeeded));
  }
  if (skipped > 0) {
    toastMessage.push(i18n.UPGRADE_RULE_SKIPPED(skipped));
  }
  return toastMessage.join(' ');
};
