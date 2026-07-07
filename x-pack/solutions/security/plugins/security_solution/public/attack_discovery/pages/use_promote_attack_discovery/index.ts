/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostAttackDiscoveryPromoteResponse } from '@kbn/elastic-assistant-common';
import { API_VERSIONS, ATTACK_DISCOVERY_INTERNAL_PROMOTE } from '@kbn/elastic-assistant-common';
import { useMutation } from '@kbn/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';

interface PromoteAttackDiscoveryParams {
  /** The IDs of the attacks to promote */
  attackIds: string[];
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Promotes the given attacks to scheduled alerts.
 * @param attackIds - The IDs of the attacks to promote
 * @param signal - An optional AbortSignal to cancel the request
 * @returns A mutation object that can be used to promote the attacks
 */
export const usePromoteAttackDiscovery = () => {
  const { addError, addSuccess } = useAppToasts();

  const promote = async ({ attackIds, signal }: PromoteAttackDiscoveryParams) =>
    KibanaServices.get().http.post<PostAttackDiscoveryPromoteResponse>(
      ATTACK_DISCOVERY_INTERNAL_PROMOTE,
      {
        body: JSON.stringify({ attack_ids: attackIds }),
        version: API_VERSIONS.internal.v1,
        signal,
      }
    );

  return useMutation<PostAttackDiscoveryPromoteResponse, Error, PromoteAttackDiscoveryParams>(
    ({ attackIds, signal }) => promote({ attackIds, signal }),
    {
      mutationKey: ['POST', ATTACK_DISCOVERY_INTERNAL_PROMOTE],
      onSuccess: () => {
        addSuccess(i18n.PROMOTE_ATTACK_DISCOVERY_SUCCESS);
      },
      onError: (error) => {
        addError(error, { title: i18n.PROMOTE_ATTACK_DISCOVERY_FAILURE });
      },
    }
  );
};
