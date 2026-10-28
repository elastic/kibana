/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import type { AggregatedFeature } from '@kbn/significant-events-schema';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  resolveSignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import { useCallback, useMemo } from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY, FEATURES_QUERY_KEY } from '../../../data/query_keys';
import { useKibana } from '../../../hooks/use_kibana';
import { useQueriesApi, type PromoteResult } from '../../../data/rules/use_queries_api';
import {
  type BulkOperationResult,
  useDiscoveryFeaturesApi,
} from '../../../data/knowledge_indicators/use_discovery_features_api';
import { BULK_WRITE_CONFLICT_MESSAGE, getFormattedError } from '../../../common/errors';
import { PROMOTE_QUERY_ALREADY_PROMOTED } from '../translations';
import { getPromoteSkipReason } from '../utils/promote_skip_reason';

export const KI_ROW_ACTION_MUTATION_KEY = ['ki-row-action'];

const DAY_MS = 24 * 60 * 60 * 1000;

const durabilityExpiresAt = (durable: boolean, ttlDays: number): string | undefined =>
  durable ? undefined : new Date(Date.now() + ttlDays * DAY_MS).toISOString();

// The cross-source bulk route reports per-instance failures and conflicts instead of rejecting;
// some may have applied.
const assertNoFailures = ({ failedCount, conflictCount }: BulkOperationResult): void => {
  if (failedCount === 0 && conflictCount === 0) {
    return;
  }
  if (failedCount === 0) {
    throw new Error(BULK_WRITE_CONFLICT_MESSAGE);
  }
  const count = failedCount + conflictCount;
  throw new Error(
    i18n.translate('xpack.nightshift.knowledge.knowledgeIndicatorActions.partialFailureError', {
      defaultMessage: '{count, plural, one {# source} other {# sources}} could not be updated',
      values: { count },
    })
  );
};

interface UseKnowledgeIndicatorActionsParams {
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorActions({
  onSuccess,
}: UseKnowledgeIndicatorActionsParams = {}) {
  const { notifications, settings } = useKibana().services;
  const { toasts } = notifications;
  const queryClient = useQueryClient();

  const featureTtlDays = useMemo<number>(() => {
    try {
      const raw = settings.globalClient.get<unknown>(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
      );
      const stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return resolveSignificantEventsTuningConfig(stored).feature_ttl_days;
    } catch {
      return DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.feature_ttl_days;
    }
  }, [settings]);
  const { excludeFeaturesInBulk, restoreFeaturesInBulk, setFeaturesDurabilityInBulk } =
    useDiscoveryFeaturesApi();
  const { promote, setQueryDurability } = useQueriesApi();

  const invalidateData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: FEATURES_QUERY_KEY }),
    ]);
  }, [queryClient]);

  const excludeAction = useMutation<void, Error, AggregatedFeature>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (feature) => {
      assertNoFailures(await excludeFeaturesInBulk([feature]));
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: EXCLUDE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: async (error) => {
      toasts.addError(getFormattedError(error), { title: EXCLUDE_ERROR_TOAST });
      await invalidateData();
    },
  });

  const restoreAction = useMutation<void, Error, AggregatedFeature>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (feature) => {
      assertNoFailures(await restoreFeaturesInBulk([feature]));
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: RESTORE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: async (error) => {
      toasts.addError(getFormattedError(error), { title: RESTORE_ERROR_TOAST });
      await invalidateData();
    },
  });

  const promoteAction = useMutation<PromoteResult, Error, string>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (queryId) => {
      return promote({ queryIds: [queryId] });
    },
    onSuccess: async (result) => {
      await invalidateData();
      if (result.promoted > 0) {
        toasts.addSuccess({ title: PROMOTE_SUCCESS_TOAST });
      } else {
        toasts.addInfo({
          title: getPromoteSkipReason(result) ?? PROMOTE_QUERY_ALREADY_PROMOTED,
        });
      }
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: PROMOTE_ERROR_TOAST });
    },
  });

  const setDurabilityAction = useMutation<
    void,
    Error,
    { knowledgeIndicator: KnowledgeIndicator; durable: boolean }
  >({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async ({ knowledgeIndicator, durable }) => {
      if (knowledgeIndicator.kind === 'feature') {
        assertNoFailures(await setFeaturesDurabilityInBulk([knowledgeIndicator.feature], durable));
      } else {
        await setQueryDurability({
          query: knowledgeIndicator.query,
          sourceId: knowledgeIndicator.source_id,
          expiresAt: durabilityExpiresAt(durable, featureTtlDays),
        });
      }
    },
    onSuccess: async (_result, { durable }) => {
      await invalidateData();
      toasts.addSuccess({
        title: durable ? MAKE_DURABLE_SUCCESS_TOAST : MAKE_EXPIRING_SUCCESS_TOAST,
      });
      onSuccess?.();
    },
    onError: async (error, { durable }) => {
      toasts.addError(getFormattedError(error), {
        title: durable ? MAKE_DURABLE_ERROR_TOAST : MAKE_EXPIRING_ERROR_TOAST,
      });
      await invalidateData();
    },
  });

  return {
    excludeFeature: excludeAction.mutate,
    restoreFeature: restoreAction.mutate,
    promoteQuery: promoteAction.mutate,
    setDurability: setDurabilityAction.mutate,
    isMutating:
      excludeAction.isLoading ||
      restoreAction.isLoading ||
      promoteAction.isLoading ||
      setDurabilityAction.isLoading,
  };
}

export const EXCLUDE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.excludeLabel',
  { defaultMessage: 'Exclude' }
);

export const RESTORE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.restoreLabel',
  { defaultMessage: 'Restore' }
);

export const PROMOTE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.promoteLabel',
  { defaultMessage: 'Promote' }
);

export const DELETE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.deleteLabel',
  {
    defaultMessage: 'Delete',
  }
);

export const MAKE_DURABLE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeDurableLabel',
  { defaultMessage: 'Make durable' }
);

export const MAKE_EXPIRING_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeExpiringLabel',
  { defaultMessage: 'Make expiring' }
);

const EXCLUDE_SUCCESS_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.excludeSuccessToast',
  { defaultMessage: 'Knowledge indicator excluded' }
);

const EXCLUDE_ERROR_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.excludeErrorToast',
  { defaultMessage: 'Failed to exclude knowledge indicator' }
);

const RESTORE_SUCCESS_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.restoreSuccessToast',
  { defaultMessage: 'Knowledge indicator restored' }
);

const RESTORE_ERROR_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.restoreErrorToast',
  { defaultMessage: 'Failed to restore knowledge indicator' }
);

const PROMOTE_SUCCESS_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.promoteSuccessToast',
  { defaultMessage: 'Knowledge indicator promoted' }
);

const PROMOTE_ERROR_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.promoteErrorToast',
  { defaultMessage: 'Failed to promote knowledge indicator' }
);

const MAKE_DURABLE_SUCCESS_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeDurableSuccessToast',
  { defaultMessage: 'Knowledge indicator is now durable' }
);

const MAKE_DURABLE_ERROR_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeDurableErrorToast',
  { defaultMessage: 'Failed to make knowledge indicator durable' }
);

const MAKE_EXPIRING_SUCCESS_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeExpiringSuccessToast',
  { defaultMessage: 'Knowledge indicator is now expiring' }
);

const MAKE_EXPIRING_ERROR_TOAST = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicatorActions.makeExpiringErrorToast',
  { defaultMessage: 'Failed to make knowledge indicator expiring' }
);
