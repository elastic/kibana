/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { DISCOVERY_QUERIES_QUERY_KEY, FEATURES_QUERY_KEY } from '../query_keys';
import { BULK_WRITE_CONFLICT_MESSAGE } from '../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import type { BulkOperationResult } from './use_discovery_features_api';
import {
  EMPTY_BULK_OPERATION_RESULT,
  getInstanceUuids,
  useDiscoveryFeaturesApi,
} from './use_discovery_features_api';

interface BulkDeleteResult {
  succeeded: number;
  failed: number;
  conflicts: number;
}

interface UseKnowledgeIndicatorsBulkDeleteParams {
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorsBulkDelete({
  onSuccess,
}: UseKnowledgeIndicatorsBulkDeleteParams = {}) {
  const {
    services: {
      notifications: { toasts },
      significantEvents: { significantEventsRepositoryClient },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { deleteFeaturesInBulk } = useDiscoveryFeaturesApi();

  const mutation = useMutation<BulkDeleteResult, Error, KnowledgeIndicator[]>({
    mutationFn: async (knowledgeIndicators) => {
      const features = knowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      const queryIds = knowledgeIndicators
        .filter((ki) => ki.kind === 'query')
        .map((ki) => ki.query.id);

      // At most two HTTP requests regardless of how many sources are involved:
      // one for the cross-source feature bulk delete, one for the cross-source
      // query bulk delete. Both endpoints group by source server-side.
      const featuresPromise: Promise<BulkOperationResult> =
        features.length > 0
          ? deleteFeaturesInBulk(features)
          : Promise.resolve(EMPTY_BULK_OPERATION_RESULT);

      const queriesPromise: Promise<BulkOperationResult> =
        queryIds.length > 0
          ? significantEventsRepositoryClient
              .fetch('POST /internal/streams/queries/_bulk_delete', {
                signal: null,
                params: { body: { queryIds } },
              })
              .then(({ succeeded, failed }) => ({
                succeededCount: succeeded,
                failedCount: failed,
                conflictCount: 0,
                failedIds: [],
                conflictIds: [],
              }))
          : Promise.resolve(EMPTY_BULK_OPERATION_RESULT);

      const [featuresSettled, queriesSettled] = await Promise.allSettled([
        featuresPromise,
        queriesPromise,
      ]);

      let succeeded = 0;
      let failed = 0;
      let conflicts = 0;

      if (featuresSettled.status === 'fulfilled') {
        // The route counts copies; the toast counts rows, and a row with a surviving copy is still
        // on screen.
        const { failedIds, conflictIds } = featuresSettled.value;
        const failedUuids = new Set(failedIds);
        const conflictUuids = new Set(conflictIds);
        for (const feature of features) {
          const uuids = getInstanceUuids(feature);
          if (uuids.some((uuid) => failedUuids.has(uuid))) {
            failed += 1;
          } else if (uuids.some((uuid) => conflictUuids.has(uuid))) {
            conflicts += 1;
          } else {
            succeeded += 1;
          }
        }
      } else {
        failed += features.length;
      }

      if (queriesSettled.status === 'fulfilled') {
        succeeded += queriesSettled.value.succeededCount;
        failed += queriesSettled.value.failedCount;
      } else {
        failed += queryIds.length;
      }

      if (succeeded === 0 && failed + conflicts > 0) {
        throw new Error(
          failed === 0 ? BULK_WRITE_CONFLICT_MESSAGE : BULK_DELETE_REJECTED_ERROR_MESSAGE
        );
      }

      return { succeeded, failed, conflicts };
    },
    onSuccess: ({ succeeded, failed, conflicts }) => {
      if (failed + conflicts > 0) {
        toasts.addWarning({
          title: getBulkDeletePartialToastTitle(succeeded, failed + conflicts),
          text: conflicts > 0 ? BULK_WRITE_CONFLICT_MESSAGE : undefined,
        });
      } else {
        toasts.addSuccess({ title: getBulkDeleteSuccessToastTitle(succeeded) });
      }
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: BULK_DELETE_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: FEATURES_QUERY_KEY, exact: false }),
      ]);
    },
  });

  return {
    deleteKnowledgeIndicatorsInBulk: async (knowledgeIndicators: KnowledgeIndicator[]) => {
      if (knowledgeIndicators.length === 0) {
        return;
      }
      await mutation.mutateAsync(knowledgeIndicators);
    },
    isDeleting: mutation.isLoading,
  };
}

const BULK_DELETE_REJECTED_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkDeleteRejectedErrorMessage',
  {
    defaultMessage: 'Some knowledge indicators could not be deleted',
  }
);

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkDeleteErrorToastTitle',
  {
    defaultMessage: 'Failed to delete selected knowledge indicators',
  }
);

const getBulkDeletePartialToastTitle = (succeeded: number, failed: number) =>
  i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.bulkDeletePartialToastTitle', {
    defaultMessage:
      '{succeeded, plural, one {# knowledge indicator} other {# knowledge indicators}} deleted. {failed, plural, one {# knowledge indicator} other {# knowledge indicators}} failed.',
    values: { succeeded, failed },
  });

const getBulkDeleteSuccessToastTitle = (count: number) =>
  i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.bulkDeleteSuccessToastTitle', {
    defaultMessage:
      '{count, plural, one {# knowledge indicator} other {# knowledge indicators}} deleted',
    values: { count },
  });
