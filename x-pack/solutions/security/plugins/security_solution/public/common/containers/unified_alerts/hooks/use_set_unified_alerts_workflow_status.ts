/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';

import type { SetUnifiedAlertsWorkflowStatusRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { setUnifiedAlertsWorkflowStatus } from '../api';

import * as i18n from './translations';
import { SET_UNIFIED_ALERTS_WORKFLOW_STATUS_MUTATION_KEY } from './constants';
import { useInvalidateSearchUnifiedAlerts } from './use_search_unified_alerts';

/**
 * Hook for setting workflow status on unified alerts using React Query mutations.
 * Automatically shows success/error toasts and invalidates the search cache on completion.
 *
 * @returns React Query mutation object with mutate function and mutation state
 */
export const useSetUnifiedAlertsWorkflowStatus = () => {
  const { addSuccess, addError } = useAppToasts();
  const invalidateSearchUnifiedAlerts = useInvalidateSearchUnifiedAlerts();

  return useMutation<{ updated: number }, Error, SetUnifiedAlertsWorkflowStatusRequestBody>(
    async (body) => {
      const response = await setUnifiedAlertsWorkflowStatus({ body });
      return { updated: response.updated ?? 0 };
    },
    {
      mutationKey: SET_UNIFIED_ALERTS_WORKFLOW_STATUS_MUTATION_KEY,
      onSuccess: (response) => {
        addSuccess(i18n.SET_UNIFIED_ALERTS_WORKFLOW_STATUS_SUCCESS_TOAST(response.updated));
      },
      onError: (error) => {
        addError(error, { title: i18n.SET_UNIFIED_ALERTS_WORKFLOW_STATUS_FAILURE });
      },
      onSettled: () => {
        invalidateSearchUnifiedAlerts();
      },
    }
  );
};
