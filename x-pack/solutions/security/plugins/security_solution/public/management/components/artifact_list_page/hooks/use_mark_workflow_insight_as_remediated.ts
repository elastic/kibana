/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { WORKFLOW_INSIGHTS } from '../../../pages/endpoint_hosts/view/translations';
import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';
import { ActionType } from '../../../../../common/endpoint/types/workflow_insights';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { WORKFLOW_INSIGHTS_UPDATE_ROUTE } from '../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../common/lib/kibana';

export const useMarkInsightAsRemediated = (backUrl?: string) => {
  const toasts = useToasts();
  const {
    application: { navigateToUrl },
    http,
  } = useKibana().services;
  return useMutation<SecurityWorkflowInsight, Error, { insightId: string }>(
    ({ insightId }: { insightId: string }) =>
      http.put<SecurityWorkflowInsight>(
        resolvePathVariables(WORKFLOW_INSIGHTS_UPDATE_ROUTE, { insightId }),
        {
          version: '1',
          body: JSON.stringify({
            action: {
              type: ActionType.Remediated,
            },
          }),
        }
      ),
    {
      onError: (err) => {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.updateInsightError,
          text: err?.message,
        });
      },
      onSuccess: () => {
        if (backUrl) return navigateToUrl(backUrl);
      },
    }
  );
};
