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
import {
  ATTACK_DISCOVERY_BULK,
  ATTACK_DISCOVERY_INTERNAL_BULK,
} from '@kbn/elastic-assistant-common';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { API_VERSIONS } from '../../../../common/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateFindAttackDiscoveries } from '../use_find_attack_discoveries';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

interface AttackDiscoveryBulkParams {
  ids: string[];
  kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
  visibility?: 'not_shared' | 'shared';
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export const useAttackDiscoveryBulk = () => {
  const { addError, addSuccess } = useAppToasts();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();

  /** Disables the attack discovery schedule. */
  const attackDiscoveryBulk = useCallback(
    () =>
      async ({
        ids,
        kibanaAlertWorkflowStatus,
        signal,
        visibility,
      }: AttackDiscoveryBulkParams): Promise<PostAttackDiscoveryBulkResponse> => {
        // Build the request body differently depending on the public API feature flag
        if (attackDiscoveryPublicApiEnabled) {
          const updatePublic: PostAttackDiscoveryBulkRequestBody['update'] = {
            enable_field_rendering: true, // always true to enable rendering fields using the `{{ user.name james }}` syntax
            ids,
            kibana_alert_workflow_status: kibanaAlertWorkflowStatus,
            visibility,
            with_replacements: false, // always false because Attack discoveries rendered in Kibana may be passed as context to a conversation, and to enable the user to see the original alert details via the `Show anonymized values` toggle
          };

          const body: PostAttackDiscoveryBulkRequestBody = { update: updatePublic };

          return KibanaServices.get().http.post<PostAttackDiscoveryBulkResponse>(
            ATTACK_DISCOVERY_BULK,
            {
              body: JSON.stringify(body, null, 2),
              signal,
              version: API_VERSIONS.public.v1,
            }
          );
        }

        // Internal API branch: do not include with_replacements
        const updateInternal = {
          ids,
          kibana_alert_workflow_status: kibanaAlertWorkflowStatus,
          visibility,
        };

        const body = { update: updateInternal };

        return KibanaServices.get().http.post<PostAttackDiscoveryBulkResponse>(
          ATTACK_DISCOVERY_INTERNAL_BULK,
          {
            body: JSON.stringify(body, null, 2),
            signal,
            version: API_VERSIONS.internal.v1,
          }
        );
      },
    [attackDiscoveryPublicApiEnabled]
  );

  const mutationKey = attackDiscoveryPublicApiEnabled
    ? ['POST', ATTACK_DISCOVERY_BULK]
    : ['POST', ATTACK_DISCOVERY_INTERNAL_BULK];

  return useMutation<PostAttackDiscoveryBulkResponse, Error, AttackDiscoveryBulkParams>(
    async ({ ids, kibanaAlertWorkflowStatus, visibility, signal }) =>
      attackDiscoveryBulk()({
        ids,
        kibanaAlertWorkflowStatus,
        visibility,
        signal,
      }),
    {
      mutationKey,
      onSuccess: (_: PostAttackDiscoveryBulkResponse, variables: AttackDiscoveryBulkParams) => {
        const { ids, kibanaAlertWorkflowStatus } = variables;

        if (kibanaAlertWorkflowStatus != null) {
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
        addError(error, { title: i18n.ERROR_UPDATING_ATTACK_DISCOVERIES });
      },
    }
  );
};
