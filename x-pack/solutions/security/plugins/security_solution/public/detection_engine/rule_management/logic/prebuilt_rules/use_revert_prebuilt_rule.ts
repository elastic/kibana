/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HTTPError } from '../../../../../common/detection_engine/types';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useRevertPrebuiltRuleMutation } from '../../api/hooks/prebuilt_rules/use_revert_prebuilt_rule_mutation';

import * as i18n from './translations';

export const useRevertPrebuiltRule = () => {
  const { addError, addSuccess } = useAppToasts();

  return useRevertPrebuiltRuleMutation({
    onError: (error) => {
      addError(populateErrorStack(error), { title: i18n.RULE_REVERT_FAILED });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result.attributes));
    },
  });
};

function populateErrorStack(error: HTTPError): HTTPError {
  error.stack = JSON.stringify(error.body, null, 2);

  return error;
}

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
    toastMessage.push(i18n.REVERT_RULE_SUCCESS(succeeded));
  }
  if (skipped > 0) {
    toastMessage.push(i18n.REVERT_RULE_SKIPPED(skipped));
  }
  return toastMessage.join(' ');
};
