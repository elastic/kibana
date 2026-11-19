/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetAttackDiscoveryGenerationsResponse,
  PostAttackDiscoveryGenerationsDismissResponse,
} from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_GENERATIONS,
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import type { QueryKey } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { useInvalidateGetAttackDiscoveryGenerations } from '../use_get_attack_discovery_generations';

interface DismissAttackDiscoveryGenerationParams {
  executionUuid: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/** Snapshot of the generations queries captured before the optimistic update, used to roll back on error */
interface DismissMutationContext {
  previousGenerations: Array<[QueryKey, GetAttackDiscoveryGenerationsResponse | undefined]>;
}

/** Disables the attack discovery schedule. */

export const useDismissAttackDiscoveryGeneration = () => {
  const { addError } = useAppToasts();

  const queryClient = useQueryClient();
  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  const dismiss = async ({ executionUuid, signal }: DismissAttackDiscoveryGenerationParams) =>
    KibanaServices.get().http.post<PostAttackDiscoveryGenerationsDismissResponse>(
      replaceParams(ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS, { execution_uuid: executionUuid }),
      { version: API_VERSIONS.public.v1, signal }
    );

  return useMutation<
    PostAttackDiscoveryGenerationsDismissResponse,
    Error,
    DismissAttackDiscoveryGenerationParams,
    DismissMutationContext
  >(({ executionUuid }) => dismiss({ executionUuid }), {
    mutationKey: ['POST', ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS],
    // Optimistically mark the generation as dismissed so the callout is removed
    // immediately on click, instead of waiting for the next poll/refetch.
    onMutate: async ({ executionUuid }) => {
      await queryClient.cancelQueries(['GET', ATTACK_DISCOVERY_GENERATIONS]);

      const previousGenerations = queryClient.getQueriesData<GetAttackDiscoveryGenerationsResponse>(
        ['GET', ATTACK_DISCOVERY_GENERATIONS]
      );

      // NOTE: `setQueriesData` matches by partial key, so this updater also runs
      // against the single-generation query (`useGetAttackDiscoveryGeneration`),
      // whose cached value is a bare `AttackDiscoveryGeneration` with no
      // `generations` array. Only transform entries that are the list response.
      queryClient.setQueriesData<GetAttackDiscoveryGenerationsResponse>(
        ['GET', ATTACK_DISCOVERY_GENERATIONS],
        (current) =>
          current == null || !Array.isArray(current.generations)
            ? current
            : {
                ...current,
                generations: current.generations.map((generation) =>
                  generation.execution_uuid === executionUuid
                    ? { ...generation, status: 'dismissed' }
                    : generation
                ),
              }
      );

      return { previousGenerations };
    },
    onError: (error, _params, context) => {
      context?.previousGenerations.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      addError(error, { title: i18n.DISMISS_ATTACK_DISCOVERY_GENERATIONS_FAILURE() });
    },
    onSettled: () => {
      invalidateGetAttackDiscoveryGenerations();
    },
  });
};
