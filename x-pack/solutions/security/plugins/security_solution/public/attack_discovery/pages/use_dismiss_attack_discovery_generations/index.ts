/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostAttackDiscoveryGenerationsDismissResponse } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS } from '@kbn/elastic-assistant-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useMutation } from '@tanstack/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

export const DISMISS_ATTACK_DISCOVERY_GENERATION_MUTATION_KEY = [
  'POST',
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
];

interface DismissAttackDiscoveryGenerationParams {
  attackDiscoveryAlertsEnabled: boolean;
  executionUuid: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */
const dismissAttackDiscoveryGeneration = async ({
  attackDiscoveryAlertsEnabled,
  executionUuid,
  signal,
}: DismissAttackDiscoveryGenerationParams): Promise<PostAttackDiscoveryGenerationsDismissResponse> => {
  if (!attackDiscoveryAlertsEnabled) {
    return {
      connector_id: '',
      status: 'dismissed',
      discoveries: 0,
      execution_uuid: executionUuid,
      loading_message: '',
      start: new Date().toISOString(),
    };
  }

  return KibanaServices.get().http.post<PostAttackDiscoveryGenerationsDismissResponse>(
    replaceParams(ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS, { execution_uuid: executionUuid }),
    { version: '1', signal }
  );
};

export const useDismissAttackDiscoveryGeneration = () => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();
  const { addError } = useAppToasts();

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  return useMutation<
    PostAttackDiscoveryGenerationsDismissResponse,
    Error,
    DismissAttackDiscoveryGenerationParams
  >(
    ({ executionUuid }) =>
      dismissAttackDiscoveryGeneration({ attackDiscoveryAlertsEnabled, executionUuid }),
    {
      mutationKey: DISMISS_ATTACK_DISCOVERY_GENERATION_MUTATION_KEY,
      onSuccess: () => {
        if (attackDiscoveryAlertsEnabled) {
          invalidateGetAttackDiscoveryGenerations();
        }
      },
      onError: (error) => {
        if (attackDiscoveryAlertsEnabled) {
          addError(error, { title: i18n.DISMISS_ATTACK_DISCOVERY_GENERATIONS_FAILURE() });
        }
      },
    }
  );
};
