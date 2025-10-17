/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostAttackDiscoveryGenerationsDismissResponse } from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
  ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useMutation } from '@tanstack/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

export const DISMISS_ATTACK_DISCOVERY_GENERATION_MUTATION_KEY = (
  attackDiscoveryPublicApiEnabled: boolean
) => [
  'POST',
  attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS
    : ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS,
];

interface DismissAttackDiscoveryGenerationParams {
  executionUuid: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */

export const useDismissAttackDiscoveryGeneration = () => {
  const { addError } = useAppToasts();

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS
    : ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS;

  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;

  const dismiss = async ({ executionUuid, signal }: DismissAttackDiscoveryGenerationParams) =>
    KibanaServices.get().http.post<PostAttackDiscoveryGenerationsDismissResponse>(
      replaceParams(route, { execution_uuid: executionUuid }),
      { version, signal }
    );

  return useMutation<
    PostAttackDiscoveryGenerationsDismissResponse,
    Error,
    DismissAttackDiscoveryGenerationParams
  >(({ executionUuid }) => dismiss({ executionUuid }), {
    mutationKey: ['POST', route],
    onSuccess: () => {
      invalidateGetAttackDiscoveryGenerations();
    },
    onError: (error) => {
      addError(error, { title: i18n.DISMISS_ATTACK_DISCOVERY_GENERATIONS_FAILURE() });
    },
  });
};
