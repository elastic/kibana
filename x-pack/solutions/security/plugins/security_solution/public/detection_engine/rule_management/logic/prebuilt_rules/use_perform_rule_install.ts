/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IToasts } from '@kbn/core/public';
import type { PerformRuleInstallationResponseBody } from '../../../../../common/api/detection_engine';
import { useToasts } from '../../../../common/lib/kibana';
import { usePerformAllRulesInstallMutation } from '../../api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import { usePerformSpecificRulesInstallMutation } from '../../api/hooks/prebuilt_rules/use_perform_specific_rules_install_mutation';

import * as i18n from './translations';
import { showErrorToast } from '../../../../common/components/utils';

export const usePerformInstallAllRules = () => {
  const toasts = useToasts();

  return usePerformAllRulesInstallMutation({
    onError: (error) => {
      handleErrorResponse(error, toasts);
    },
    onSuccess: (result) => {
      handleSuccessResponse(result, toasts);
    },
  });
};

export const usePerformInstallSpecificRules = () => {
  const toasts = useToasts();

  return usePerformSpecificRulesInstallMutation({
    onError: (error) => {
      handleErrorResponse(error, toasts);
    },
    onSuccess: (result) => {
      handleSuccessResponse(result, toasts);
    },
  });
};

function handleErrorResponse(error: unknown, toasts: IToasts) {
  showErrorToast({
    title: i18n.RULE_INSTALLATION_FAILED,
    fullMessage: JSON.stringify(error, null, 2),
    toasts,
  });
}

function handleSuccessResponse(result: PerformRuleInstallationResponseBody, toasts: IToasts) {
  const successToastMessage = getSuccessToastMessage(result);
  if (successToastMessage) {
    toasts.addSuccess(successToastMessage);
  }

  if (result.summary.failed > 0) {
    showErrorToast({
      title: i18n.INSTALL_RULE_FAILED(result.summary.failed),
      fullMessage: JSON.stringify(result.errors, null, 2),
      toasts,
    });
  }
}

function getSuccessToastMessage(result: {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}): string {
  const toastMessages: string[] = [];
  const {
    summary: { succeeded, skipped },
  } = result;
  if (succeeded > 0) {
    toastMessages.push(i18n.INSTALL_RULE_SUCCESS(succeeded));
  }
  if (skipped > 0) {
    toastMessages.push(i18n.INSTALL_RULE_SKIPPED(skipped));
  }
  return toastMessages.join(' ');
}
