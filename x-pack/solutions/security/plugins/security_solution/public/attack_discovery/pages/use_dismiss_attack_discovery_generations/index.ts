/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostAttackDiscoveryGenerationsDismissResponse } from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useMutation } from '@kbn/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';

interface DismissAttackDiscoveryGenerationParams {
  executionUuid: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */

export const useDismissAttackDiscoveryGeneration = () => {
  const { addError } = useAppToasts();

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  const dismiss = async ({ executionUuid, signal }: DismissAttackDiscoveryGenerationParams) =>
    KibanaServices.get().http.post<PostAttackDiscoveryGenerationsDismissResponse>(
      replaceParams(ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS, { execution_uuid: executionUuid }),
      { version: API_VERSIONS.public.v1, signal }
    );

  return useMutation<
    PostAttackDiscoveryGenerationsDismissResponse,
    Error,
    DismissAttackDiscoveryGenerationParams
  >(({ executionUuid }) => dismiss({ executionUuid }), {
    mutationKey: ['POST', ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS],
    onSuccess: () => {
      invalidateGetAttackDiscoveryGenerations();
    },
    onError: (error) => {
      addError(error, { title: i18n.DISMISS_ATTACK_DISCOVERY_GENERATIONS_FAILURE() });
    },
  });
};
