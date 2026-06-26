/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { useRestoreRuleFromHistoryMutation } from '../../../rule_management/api/hooks/use_restore_rule_revision_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

interface UseRuleRestoreProps {
  ruleId: string; // RuleObjectId
  onRestoreSuccess?: () => void;
}

interface UseRuleRestoreResult {
  restoreFromHistory: (item: RuleHistoryItem) => void;
  restoringItemId: string | undefined;
}

export function useRuleRestoreFromHistory({
  ruleId,
  onRestoreSuccess,
}: UseRuleRestoreProps): UseRuleRestoreResult {
  const { addSuccess, addError, addInfo } = useAppToasts();
  const [restoringItemId, setRestoringItemId] = useState<string | undefined>(undefined);
  const restoringItemRef = useRef<RuleHistoryItem | undefined>(undefined);

  const { mutate: restoreMutate } = useRestoreRuleFromHistoryMutation({
    onSettled: (response, error) => {
      const restoringItem = restoringItemRef.current;
      restoringItemRef.current = undefined;
      setRestoringItemId(undefined);

      if (response?.no_change) {
        addInfo(i18n.RESTORE_NO_CHANGE_TOAST);
        return;
      }

      if (response) {
        const restoredRevision = restoringItem?.rule.revision ?? response.rule.revision;
        const message =
          response.rule.rule_source.type === 'external'
            ? i18n.PREBUILT_RULE_RESTORE_SUCCESS_TOAST(
                restoringItem?.rule.version ?? response.rule.version,
                restoredRevision
              )
            : i18n.CUSTOM_RULE_RESTORE_SUCCESS_TOAST(restoredRevision);
        addSuccess(message);
        onRestoreSuccess?.();
      }

      if (error) {
        addError(error, { title: i18n.RESTORE_ERROR_TOAST });
      }
    },
  });

  const handleRestore = useCallback(
    (item: RuleHistoryItem) => {
      setRestoringItemId(item.id);
      restoringItemRef.current = item;
      restoreMutate({ ruleId, changeId: item.id });
    },
    [restoreMutate, ruleId]
  );

  return {
    restoreFromHistory: handleRestore,
    restoringItemId,
  };
}
