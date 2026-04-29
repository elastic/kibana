/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { BulkActionSummary } from '..';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  BulkActionEditPayload,
  BulkActionType,
} from '../../../../../common/api/detection_engine/rule_management';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { explainBulkEditSuccess, explainBulkSuccess, summarizeBulkSuccess } from './translations';

interface ShowBulkSuccessToastProps {
  actionType: BulkActionType;
  summary: BulkActionSummary;
  editPayload?: BulkActionEditPayload[];
}

export function useShowBulkSuccessToast() {
  const toasts = useAppToasts();

  return useCallback(
    ({ actionType, summary, editPayload }: ShowBulkSuccessToastProps) => {
      const text =
        actionType === BulkActionTypeEnum.edit
          ? explainBulkEditSuccess(editPayload ?? [], summary)
          : explainBulkSuccess(actionType, summary);

      const toastBody = {
        title: summarizeBulkSuccess(actionType, summary),
        text,
      };

      const shouldShowSuccessToast = summary.succeeded >= 1;

      if (shouldShowSuccessToast) {
        toasts.addSuccess(toastBody);
      } else {
        // In the case when the succeeded count is 0, show a neutral toast instead.
        // This can happen when all elements in the bulk action were skipped.
        toasts.addInfo(toastBody);
      }
    },
    [toasts]
  );
}
