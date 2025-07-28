/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PostAttackDiscoveryBulkRequestBody,
  PostAttackDiscoveryBulkResponse,
} from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_BULK } from '@kbn/elastic-assistant-common';
import { useMutation } from '@tanstack/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateFindAttackDiscoveries } from '../use_find_attack_discoveries';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

export const ATTACK_DISCOVERY_BULK_MUTATION_KEY = ['POST', ATTACK_DISCOVERY_BULK];

interface AttackDiscoveryBulkParams {
  attackDiscoveryAlertsEnabled: boolean;
  ids: string[];
  kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
  visibility?: 'not_shared' | 'shared';
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */
const attackDiscoveryBulk = async ({
  attackDiscoveryAlertsEnabled,
  ids,
  kibanaAlertWorkflowStatus,
  signal,
  visibility,
}: AttackDiscoveryBulkParams): Promise<PostAttackDiscoveryBulkResponse> => {
  const body: PostAttackDiscoveryBulkRequestBody = {
    update: {
      ids,
      kibana_alert_workflow_status: kibanaAlertWorkflowStatus,
      visibility,
    },
  };

  if (!attackDiscoveryAlertsEnabled) {
    return {
      data: [],
    };
  }

  return KibanaServices.get().http.post<PostAttackDiscoveryBulkResponse>(ATTACK_DISCOVERY_BULK, {
    body: JSON.stringify(body, null, 2),
    signal,
    version: '1',
  });
};

export const useAttackDiscoveryBulk = () => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();
  const { addError, addSuccess } = useAppToasts();

  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();

  return useMutation<PostAttackDiscoveryBulkResponse, Error, AttackDiscoveryBulkParams>(
    ({ ids, kibanaAlertWorkflowStatus, visibility }) =>
      attackDiscoveryBulk({
        attackDiscoveryAlertsEnabled,
        ids,
        kibanaAlertWorkflowStatus,
        visibility,
      }),
    {
      mutationKey: ATTACK_DISCOVERY_BULK_MUTATION_KEY,
      onSuccess: (_: PostAttackDiscoveryBulkResponse, variables: AttackDiscoveryBulkParams) => {
        const { ids, kibanaAlertWorkflowStatus } = variables;

        if (attackDiscoveryAlertsEnabled && kibanaAlertWorkflowStatus != null) {
          invalidateFindAttackDiscoveries();
          addSuccess(
            i18n.MARKED_ATTACK_DISCOVERIES({
              attackDiscoveries: ids.length,
              kibanaAlertWorkflowStatus,
            })
          );
        }
      },
      onError: (error) => {
        if (attackDiscoveryAlertsEnabled) {
          addError(error, { title: i18n.ERROR_UPDATING_ATTACK_DISCOVERIES });
        }
      },
    }
  );
};
