/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { useMutation } from '@kbn/react-query';

import { updateAlertStatus } from '../../../../../common/components/toolbar/bulk_actions/update_alerts';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useInvalidateFindAttackDiscoveries } from '../../../use_find_attack_discoveries';

interface UpdatedAlertsResponse {
  updated: number;
  version_conflicts: UpdateByQueryResponse['version_conflicts'];
}

interface UpdateAlertsStatusParams {
  ids: string[];
  kibanaAlertWorkflowStatus: 'open' | 'acknowledged' | 'closed';
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export const useUpdateAlertsStatus = () => {
  const { addError, addSuccess, addWarning } = useAppToasts();

  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();

  return useMutation<UpdatedAlertsResponse, Error, UpdateAlertsStatusParams>(
    ({ ids, kibanaAlertWorkflowStatus }) =>
      updateAlertStatus({
        status: kibanaAlertWorkflowStatus,
        signalIds: ids,
      }),
    {
      onSuccess: (data: UpdatedAlertsResponse, variables: UpdateAlertsStatusParams) => {
        const { ids, kibanaAlertWorkflowStatus } = variables;
        const { updated, version_conflicts } = data;

        const alertsCount = ids.length; // total alerts
        const allAlertsUpdated = updated === alertsCount;

        invalidateFindAttackDiscoveries();

        if (allAlertsUpdated) {
          addSuccess(i18n.SUCCESSFULLY_MARKED_ALERTS({ updated, kibanaAlertWorkflowStatus }));
        } else if (version_conflicts != null && version_conflicts > 0) {
          addWarning(
            i18n.UPDATED_ALERTS_WITH_VERSION_CONFLICTS({
              kibanaAlertWorkflowStatus,
              updated,
              versionConflicts: version_conflicts,
            })
          );
        } else {
          addWarning(
            i18n.PARTIALLY_UPDATED_ALERTS({
              alertsCount,
              kibanaAlertWorkflowStatus,
              updated,
            })
          );
        }
      },
      onError: (error) => {
        addError(error, { title: i18n.ERROR_UPDATING_ALERTS });
      },
    }
  );
};
